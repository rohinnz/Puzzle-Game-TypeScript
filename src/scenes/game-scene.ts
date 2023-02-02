/**
 * @author       Rohin Knight <rohin.knight@gmail.com>
 * @copyright    2021 Rohin Knight
 * @description  Puzzle Game Prototype
 * @license      {@link https://opensource.org/licenses/MIT|MIT License}
 */

import { V2 } from '../objects/common';
import { IsL1Type, IsL2Type, BoardLogic, BlockType, CommandType, FallBox, PlaceBlock, MineBlock, MovePlayer, FallPlayer, PickupItem, PickupBox, DropBox } from '../objects/boardlogic';

const TILE_SIZE = 32;

const FRAME_TO_BLOCKTYPE = {
	1: BlockType.Box, 
	3: BlockType.Brick, 
	4: BlockType.Ladder,
	5: BlockType.Trap1,
	6: BlockType.Trap2,
	8: BlockType.Gem,
	25: BlockType.HardBlock,
	41: BlockType.BlockParts,
	49: BlockType.Pickhammer,
	26: BlockType.LockedDoor,
	10: BlockType.BoxLifter,
	33: BlockType.HardLadder,
	17: BlockType.Key,
}; // todo: Lookup what const at end means

// todo: Understand what this all means and whether we can get it to work
/*
declare function invert<
    T extends Record<PropertyKey, PropertyKey>
>(obj: T): {
    [K in keyof T as T[K]]: K
};*/

//const BLOCKTYPE_TO_FRAME = invert(FRAME_TO_BLOCKTYPE);


let BLOCKTYPE_TO_FRAME = {}; 
for (const key of Object.keys(FRAME_TO_BLOCKTYPE)) {
	const value = FRAME_TO_BLOCKTYPE[key];
	BLOCKTYPE_TO_FRAME[value] = key;
}



interface InventoryUpdated {
	onInventoryUpdated(): void;
}

class Inventory extends Phaser.GameObjects.Container {
	marker: Phaser.GameObjects.Graphics;
	blockImages: Phaser.GameObjects.Image[] = [];
	//blockTypes: BlockType[] = [];
	blockAmount: Phaser.GameObjects.Text[] = [];
	selectedBlockType: BlockType = BlockType.None;
	validPositions: V2[];
	inventoryUpdateCallback: InventoryUpdated;

	constructor(numInventorySlots: number, scene: Phaser.Scene, x?: number, y?: number, children?: Phaser.GameObjects.GameObject[])
	{
		super(scene, x, y, children);
		scene.add.existing(this);
		const SPACING = 10;
		this.inventoryUpdateCallback = <GameScene>scene;

		for (let i = 0; i < numInventorySlots; ++i)
		{
			const blockImage = scene.add.image(0, 0, 'tiles_', 1).setInteractive();

			this.add(blockImage);
			blockImage.x = i * TILE_SIZE + i * SPACING
			let text = scene.add.text(blockImage.x - 5, 20, '', { font: '16px Courier'});
			this.add(text);
			this.blockAmount.push(text);

			blockImage.on('pointerdown', function(event) {
				const inventory = <Inventory>this.parentContainer;
				inventory._setMarker(this);
				inventory.inventoryUpdateCallback.onInventoryUpdated();
			});
			this.blockImages.push(blockImage);
		}

		this.marker = scene.add.graphics();
		this.marker.lineStyle(2, 0xffffff, 1);
		this.marker.strokeRect(0, 0, 34, 34);
		this.marker.visible = false;
		this.add(this.marker)
	}

	_setMarker(blockImage: Phaser.GameObjects.Image): void
	{
		if (blockImage == null) {
			this.marker.visible = false;
			this.selectedBlockType = BlockType.None;
		}
		else {
			this.marker.x = blockImage.x - TILE_SIZE * 0.5 - 1;
			this.marker.y = blockImage.y - TILE_SIZE * 0.5 - 1;
			this.marker.visible = true;

			const frameNum = blockImage.frame.name + 1
			this.selectedBlockType = FRAME_TO_BLOCKTYPE[frameNum];
		}
	}

	updateInventory(boardLogic: BoardLogic): void
	{
		let i = 0;
		if (this.selectedBlockType != BlockType.None && boardLogic.state.inventory.get(this.selectedBlockType) <= 0) {
			this._setMarker(null);
		}

		for (var [blockType, amount] of boardLogic.state.inventory) {
			if (amount > 0) {
				const frame = BLOCKTYPE_TO_FRAME[blockType] - 1;

				this.blockAmount[i].setText('' + amount);
				this.blockImages[i].setFrame(frame);
				this.blockImages[i].visible = true;
				if (this.selectedBlockType == BlockType.None || this.selectedBlockType == blockType) {
					console.log("Setting marker")
					this._setMarker(this.blockImages[i]);
				}
				++i;
			}
		}
		for (; i < this.blockImages.length; ++i) {
			this.blockImages[i].visible = false;
			this.blockAmount[i].setText('');
		}

		if (this.selectedBlockType != BlockType.None) {
			this.validPositions = boardLogic.positionsForInventoryItem(this.selectedBlockType);
		}
	}
}

export class GameScene extends Phaser.Scene implements InventoryUpdated {
	private player: Phaser.GameObjects.Container;
	private playerImage: Phaser.GameObjects.Image;
	private box: Phaser.GameObjects.Image;
	private text: Phaser.GameObjects.Text;
	private inventorySquare: Phaser.GameObjects.Rectangle;

	private _logic: BoardLogic;
	private _tilemap: Phaser.Tilemaps.Tilemap;

	private layer1: Phaser.Tilemaps.TilemapLayer;
	private layer2: Phaser.Tilemaps.TilemapLayer;

	private leftKey: Phaser.Input.Keyboard.Key;
	private rightKey: Phaser.Input.Keyboard.Key;
	private upKey: Phaser.Input.Keyboard.Key;
	private downKey: Phaser.Input.Keyboard.Key;

	//private waitTurnAround: Phaser.Input.Keyboard.Key;
	private restartLevel: Phaser.Input.Keyboard.Key;
	private undoLastMove: Phaser.Input.Keyboard.Key;

	//private inventoryChange: Phaser.Input.Keyboard.Key;
	private inventory: Inventory;
	private levelComplete: boolean;

	constructor() {
		super({
			key: "GameScene"
		});
	}

	init(): void {

	}

	preload(): void {
		this.load.pack(
			"blockHeroPack",
			"./src/assets/pack.json",
			"blockHeroPack"
		);

		this.load.spritesheet('tiles_', './src/assets/images/tiles.png', {frameWidth: 32, frameHeight: 32});
	}

	create(): void {
		this.levelComplete = false;
		this._tilemap = this.make.tilemap({ key: 'tilemap' });
		const rect = this.add.rectangle(this._tilemap.widthInPixels * 0.5, this._tilemap.heightInPixels * 0.5, this._tilemap.widthInPixels, this._tilemap.heightInPixels, 0x4c4c4c);

		const tileset = this._tilemap.addTilesetImage('tiles');
		this.player = this.add.container();
		this.layer1 = this._tilemap.createLayer('l1', tileset);
		this.layer2 = this._tilemap.createLayer('l2', tileset);

		this.playerImage = this._tilemap.createFromObjects("objs", {key: "player"})[0] as Phaser.GameObjects.Sprite;
		this.box = this.add.image(0, 0, 'box');
		this.box.y = -TILE_SIZE;
		this.box.visible = false;


		this.player = this.add.container();
		this.player.add(this.playerImage);
		this.player.add(this.box);
		this.player.x = this.playerImage.x;
		this.player.y = this.playerImage.y;
		this.playerImage.x = 0;
		this.playerImage.y = 0;

		this.inventorySquare = this.add.rectangle(0, 0, TILE_SIZE, TILE_SIZE, 0x00ff00, 0.5);
		this.inventorySquare.visible = false;

		const playerGridPos = new V2(Math.floor(this.player.x / TILE_SIZE), Math.floor(this.player.y / TILE_SIZE));
		const mapSize = new V2(this._tilemap.width, this._tilemap.height);

		this._logic = new BoardLogic(playerGridPos, mapSize);
		this._logic.state.setL2Block
		this._populateStateGrid(mapSize);

		this.inventory = new Inventory(this._logic.state.inventory.size, this, 50, this._tilemap.heightInPixels + 50);


		this.leftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
		this.rightKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
		this.upKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
		this.downKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
		
		this.restartLevel = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
		this.undoLastMove = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.U);

		this.text = this.add.text(10, 10, '', { font: '16px Courier'});
		this._updateText();

		this.events.on('destroy', this._onSceneDestroy)
		this.input.on('pointerdown', function (pointer) {
			const gameScene = <GameScene>this.scene;
			gameScene.inventoryUse();
		});
	}

	_onSceneDestroy(): void
	{
		//this.inventorySquares = null;
	}

	_populateStateGrid(mapSize: V2): void
	{
		this._logic.state.l1Blocks = [];
		this._logic.state.l2Blocks = [];

		for (let x: number = 0; x < mapSize.x; ++x) {
			this._logic.state.l1Blocks[x] = [];
			this._logic.state.l2Blocks[x] = [];

			for (let y: number = 0; y < mapSize.y; ++y) {
				this._logic.state.l1Blocks[x][y] = this._getLayerBlock(new V2(x, y), this.layer1);
				this._logic.state.l2Blocks[x][y] = this._getLayerBlock(new V2(x, y), this.layer2);
			}
		}
	}

	_gridToScreenPos(gridPos: V2): Phaser.Math.Vector2
	{
		return new Phaser.Math.Vector2(gridPos.x * TILE_SIZE + TILE_SIZE * 0.5, gridPos.y * TILE_SIZE + TILE_SIZE * 0.5);
	}

	_highlightInventorySquare(): void {
		if (this.inventory.selectedBlockType != BlockType.None) {
			let worldPoint = <Phaser.Math.Vector2>this.input.activePointer.positionToCamera(this.cameras.main);
			let pointerTileX = this._tilemap.worldToTileX(worldPoint.x);
			let pointerTileY = this._tilemap.worldToTileY(worldPoint.y);

			for (let p of this.inventory.validPositions) {
				if (p.x == pointerTileX && p.y == pointerTileY) {
					const screenPos = new V2( pointerTileX * TILE_SIZE + TILE_SIZE * 0.5, pointerTileY * TILE_SIZE + TILE_SIZE * 0.5);
					this.inventorySquare.visible = true;
					this.inventorySquare.x = screenPos.x;
					this.inventorySquare.y = screenPos.y;
					return;
				}
			}
		}

		this.inventorySquare.visible = false;
	}

	update(): void {
		if (this.levelComplete) {
			return;
		}

		this._highlightInventorySquare();

		if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
			this._movePlayer(V2.LEFT);
		}
		else if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
			this._movePlayer(V2.RIGHT);
		}
		else if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
			this._movePlayer(V2.UP);
		}
		else if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
			this._movePlayer(V2.DOWN);
		}
		else if (Phaser.Input.Keyboard.JustDown(this.restartLevel)) {
			this._restartLevel();
		}
		else if (Phaser.Input.Keyboard.JustDown(this.undoLastMove)) {
			this._undoLastMove();
		}
	}


	//=====================================================================
	// IBoardStateProvider implementation

	mapSize(): V2 {
		return new V2(this._tilemap.width, this._tilemap.height);
	}

	blocksAt(pos: V2): BlockType[] {
		let blocks: BlockType[] = [];

		const tile1 = this.layer1.getTileAt(pos.x, pos.y)
		const tile2 = this.layer2.getTileAt(pos.x, pos.y)

		if (tile1 != null) blocks.push(FRAME_TO_BLOCKTYPE[tile1.index])
		if (tile2 != null) blocks.push(FRAME_TO_BLOCKTYPE[tile2.index])

		return blocks;
	}
	setL1Block(pos: V2, blockType: BlockType): void {
		console.assert(IsL1Type(blockType));
		this._setLayerBlock(pos, blockType, this.layer1);
	}
	setL2Block(pos: V2, blockType: BlockType): void {
		console.assert(IsL2Type(blockType));
		this._setLayerBlock(pos, blockType, this.layer2);
	}
	setBlock(pos: V2, blockType: BlockType): void
	{
		if (this._logic.isL2OnlyBlock(blockType)) {
			this.setL2Block(pos, blockType);
		}
		else
		{
			this.setL1Block(pos, blockType);
		}
	}

	_setLayerBlock(pos: V2, blockType: BlockType, layer: Phaser.Tilemaps.TilemapLayer): void {
		const tileIdx = BLOCKTYPE_TO_FRAME[blockType];
		layer.putTileAt(tileIdx, pos.x, pos.y);
	}

	getL1Block(pos: V2): BlockType
	{
		return this._getLayerBlock(pos, this.layer1);
	}

	getL2Block(pos: V2): BlockType
	{
		return this._getLayerBlock(pos, this.layer2);
	}

	_getLayerBlock(pos: V2, layer: Phaser.Tilemaps.TilemapLayer): BlockType
	{
		const tile = layer.getTileAt(pos.x, pos.y)
		return tile == null ? BlockType.None : FRAME_TO_BLOCKTYPE[tile.index];
	}

	_movePlayer(dir: V2): void {
		const move = this._logic.tryMovePlayer(dir);
		if (!move.isValid()) return;

		const playerPos = this._logic.state.playerPos;
		const tile = this.layer2.getTileAt(playerPos.x, playerPos.y);
		if (tile != null && tile.index == BLOCKTYPE_TO_FRAME[BlockType.LockedDoor])
		{
			console.log(tile.index);
			this.levelComplete = true;
		}

		if (move.firstCommand) {
			//this.DEBUG_logTileAtPlayer()

			const movePlayer = <MovePlayer>move.firstCommand;

			// todo: animate move to
			this.playerImage.flipX = !this._logic.state.playerFacingRight;
			this._animateMovePlayerTo(movePlayer.to);

			for (let cmd of move.secondCommands) {
				if (cmd.type == CommandType.FallPlayer) {
					const fallPlayer = <FallPlayer>cmd;
					this._animateMovePlayerTo(fallPlayer.to);
				}
				else if (cmd.type == CommandType.PickupItem) {
					const pickupItem = <PickupItem>cmd;
					this.setL2Block(pickupItem.pos, BlockType.None)
				}
				else if (cmd.type == CommandType.DropBox) {
					const dropBox = <DropBox>cmd;
					this.setL1Block(dropBox.end, BlockType.Box);
					this.box.visible = false;
				}
			}
		}



		this._updateText();
	}
	
	_waitTurnAround(): void {
		const move = this._logic.turnAround();
		this.playerImage.flipX = !this._logic.state.playerFacingRight;
		this._updateText();
	}

	_animateMovePlayerTo(pos: V2): void {
		const screenPos = this._gridToScreenPos(pos);
		this.player.x = screenPos.x;
		this.player.y = screenPos.y;
	}

	_restartLevel(): void {
		this.scene.restart();
	}

	inventoryUse(): void
	{
		if (!this.inventorySquare.visible) return;

		let worldPoint = <Phaser.Math.Vector2>this.input.activePointer.positionToCamera(this.cameras.main);
		let pointerTileX = this._tilemap.worldToTileX(worldPoint.x);
		let pointerTileY = this._tilemap.worldToTileY(worldPoint.y);

		for (let p of this.inventory.validPositions) {
			if (p.x == pointerTileX && p.y == pointerTileY) {
				this._inventoryUse(p);
			}
		}
	}

	_inventoryUse(pos: V2): void
	{		
		const move = this._logic.useInventoryItem(this.inventory.selectedBlockType, pos);

		if (move.firstCommand) {
			//this.DEBUG_logTileAtPlayer()

			if (move.firstCommand.type == CommandType.MineBlock) {
				const mineBlock = <MineBlock>move.firstCommand;
				this.setL1Block(mineBlock.pos, BlockType.None);
				this.setL2Block(mineBlock.pos, BlockType.None);
			}
			else if (move.firstCommand.type == CommandType.PlaceBlock) {
				const placeBlock = <PlaceBlock>move.firstCommand;
				this.setBlock(placeBlock.pos, placeBlock.blockType);
			}
			else if (move.firstCommand.type == CommandType.PickupBox) {
				const pickupBox = <PickupBox>move.firstCommand;
				this.setL1Block(pickupBox.pos, BlockType.None)
				this.box.visible = true;
			}
			else if (move.firstCommand.type == CommandType.DropBox) {
				// todo: Animate falling

				const dropBox = <DropBox>move.firstCommand;
				this.setL1Block(dropBox.end, BlockType.Box)
				this.box.visible = false;
			}
			else {
				console.assert(false, 'Unhandled command!');
			}


			// todo: animate move to
			//this.playerImage.flipX = !this._logic.state.playerFacingRight;
			//this._animateMovePlayerTo(movePlayer.to);

			for (let cmd of move.secondCommands) {
				if (cmd.type == CommandType.FallPlayer) {
					const fallPlayer = <FallPlayer>cmd;
					this._animateMovePlayerTo(fallPlayer.to);
				}
				else if (cmd.type == CommandType.PickupItem) {
					const pickupItem = <PickupItem>cmd;
					this.setL2Block(pickupItem.pos, BlockType.None)
				}
				else if (cmd.type == CommandType.FallBox) {
					const fallBox = <FallBox>cmd;
					this.setL1Block(fallBox.start, BlockType.None)
					this.setL1Block(fallBox.end, BlockType.Box)
				}
			}
		}


		// todo: Update player position as well
		this._updateText();
	}

	_undoLastMove(): void {
		const move = this._logic.undoLastMove();
		if (move == null) return;

		const allCmds = [move.firstCommand, ...move.secondCommands];

		for (let cmd of allCmds) {
			if (cmd.type == CommandType.FallPlayer) {
				const fallPlayer = <FallPlayer>cmd;
				this._animateMovePlayerTo(fallPlayer.from);
			}
			else if (cmd.type == CommandType.PickupItem) {
				const pickupItem = <PickupItem>cmd;
				this.setL2Block(pickupItem.pos, pickupItem.blockType)
			}
			else if (cmd.type == CommandType.PickupBox) {
				const pickupBox = <PickupBox>cmd;
				this.setL1Block(pickupBox.pos, BlockType.Box)
			}
			else if (cmd.type == CommandType.DropBox) {
				const dropBox = <DropBox>cmd;
				this.setL1Block(dropBox.end, BlockType.None)
			}
			else if (cmd.type == CommandType.MineBlock) {
				const mineBlock = <MineBlock>cmd;
				this.setBlock(mineBlock.pos, mineBlock.blockType);
			}
			else if (cmd.type == CommandType.FallBox) {
				const fallBox = <FallBox>cmd;
				this.setL1Block(fallBox.end, BlockType.None)
				this.setL1Block(fallBox.start, BlockType.Box)
			}
		}

		this.box.visible = this._logic.state.isCarryingBox;
		this.playerImage.flipX = !this._logic.state.playerFacingRight;
		this._animateMovePlayerTo(this._logic.state.playerPos);

		this._updateText();
	}
	
	onInventoryUpdated(): void {
		this.inventory.updateInventory(this._logic);
	}

	_updateText() {
		this.inventory.updateInventory(this._logic);

		let newText = [];
		newText.push('(R)Restart (U)Undo - Arrow keys = move. Mouse = break/place block.');

		newText.push('Moves: ' + this._logic.state.moves.length + 
		/*' - Gems: ' + this._logic.state.inventory.get(BlockType.Gem) + */
		' - Player Pos: ' + this._logic.state.playerPos);

		if (this.levelComplete) {
			newText.push('\n\nPUZZLE SOLVED');
		}

		//this.DEBUG_logTileAtPlayer();
		this.text.setText(newText);
	}

	/*
	DEBUG_logTileAtPlayer(): void
	{
		const pos = this._logic.state.playerPos
		const tile = this.layer2.getTileAt(pos.x, pos.y)
		console.log(tile);
	}*/
}
