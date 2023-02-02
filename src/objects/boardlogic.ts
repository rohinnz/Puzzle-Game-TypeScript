import { V2 } from './common';

export enum BlockType {
	None,
	Box,
	Brick,
	HardBlock,
	Ladder,
	HardLadder,

	LockedDoor,
	Trap1,
	Trap2,

	BoxLifter,
	Gem,
	Pickhammer,
	Key,
	BlockParts
}

const L2OnlyTypes = new Set<BlockType>([BlockType.Key, BlockType.Pickhammer, BlockType.Gem, BlockType.Ladder, BlockType.BoxLifter]);

export function IsL1Type(type: BlockType): boolean
{
	return !L2OnlyTypes.has(type);
}

export function IsL2Type(type: BlockType): boolean
{
	return L2OnlyTypes.has(type) || type == BlockType.None;
}

/**
 * A move is made up of 1 or more commands
 */
class Move {
	firstCommand: Command;
	secondCommands: Command[] = [];

	setExecuteFirst(command: Command, state: BoardState)
	{
		
		// todo: Throw exeception if already set

		command.execute(state);
		this.firstCommand = command;
	}
	addExecuteSecond(command: Command, state: BoardState)
	{
		command.execute(state)
		this.secondCommands.push(command);
	}
	addExecute(command: Command, state: BoardState)
	{
		command.execute(state)
		if (this.firstCommand == undefined) {
			this.firstCommand = command;
		}
		else {
			this.secondCommands.push(command);
		}
	}
	isValid(): boolean
	{
		return this.firstCommand != undefined;
	}
}

export enum CommandType {
	MovePlayer,
	PickupItem,
	FallPlayer,
	PlaceBlock,
	MineBlock,
	PickupBox,
	DropBox,
	FallBox,
	CrushPlayer
}

export interface Command {
	type: CommandType;
	execute(state: BoardState): void;
	undo(state: BoardState): void;
}

// Can we use this for move and fall?rt
export class MovePlayer implements Command {
	type = CommandType.MovePlayer;
	from: V2;
	to: V2;
	facingRight: boolean
	wasFacingRight: boolean
	constructor(from: V2, to: V2, facingRight: boolean, wasFacingRight: boolean) {

		this.from = from;
		this.to = to;
		this.facingRight = facingRight;
		this.wasFacingRight = wasFacingRight;
	}
	execute(state: BoardState): void {
		state.playerPos = this.to;
		state.playerFacingRight = this.facingRight;
	}
	undo(state: BoardState): void {
		state.playerPos = this.from;
		state.playerFacingRight = this.wasFacingRight;
	}
}

export class FallPlayer implements Command {
	type = CommandType.FallPlayer;
	from: V2;
	to: V2;
	constructor(from: V2, to: V2) {
		this.from = from;
		this.to = to;
	}
	execute(state: BoardState): void {
		state.playerPos = this.to;
	}
	undo(state: BoardState): void {
		state.playerPos = this.from;
	}
}

export class PlaceBlock implements Command {
	type = CommandType.PlaceBlock;
	pos: V2;
	blockType: BlockType;
	constructor(pos: V2, blockType: BlockType) {
		this.pos = pos;
		this.blockType = blockType;
	}
	execute(state: BoardState): void {
		state.setBlock(this.pos, this.blockType);
		state.decInventory(this.blockType);
	}
	undo(state: BoardState): void {
		state.setNoneForType(this.pos, this.blockType);
		state.incInventory(this.blockType);
	}
}

export class MineBlock implements Command {
	type = CommandType.MineBlock;
	pos: V2;
	blockType: BlockType;
	constructor(pos: V2, blockType: BlockType) {
		this.pos = pos;
		this.blockType = blockType;
	}
	execute(state: BoardState): void {
		state.setBlock(this.pos, BlockType.None);
		state.incInventory(this.blockType);
		state.decInventory(BlockType.Pickhammer);
	}
	undo(state: BoardState): void {
		state.setBlock(this.pos, this.blockType);
		state.decInventory(this.blockType);
		state.incInventory(BlockType.Pickhammer);
	}
}

export class PickupItem implements Command {
	type = CommandType.PickupItem;
	pos: V2;
	blockType: BlockType;
	constructor(pos: V2, blockType: BlockType) {
		this.pos = pos;
		this.blockType = blockType;
	}
	execute(state: BoardState): void {
		state.setL2Block(this.pos, BlockType.None);
		state.incInventory(this.blockType); //]++;
	}
	undo(state: BoardState): void {
		state.setL2Block(this.pos, this.blockType);
		state.decInventory(this.blockType); //--;
	}
}

export class PickupBox implements Command  {
	type = CommandType.PickupBox;
	pos: V2;
	constructor(pos: V2) {
		this.pos = pos;
	}
	execute(state: BoardState): void {
		state.isCarryingBox = true;
		state.setL1Block(this.pos, BlockType.None);
	}
	undo(state: BoardState): void {
		state.isCarryingBox = false;
		state.setL1Block(this.pos, BlockType.Box);
	}
}

export class DropBox implements Command {
	type = CommandType.DropBox;
	start: V2;
	end: V2;
	constructor(start: V2, end: V2) {
		this.start = start;
		this.end = end;
	}
	execute(state: BoardState): void {
		state.isCarryingBox = false;
		state.setL1Block(this.end, BlockType.Box)
	}
	undo(state: BoardState): void {
		state.isCarryingBox = true;
		state.setL1Block(this.end, BlockType.None);
	}
}

export class FallBox implements Command {
	type = CommandType.FallBox;
	start: V2;
	end: V2;
	constructor(start: V2, end: V2) {
		this.start = start;
		this.end = end;
	}
	execute(state: BoardState): void {
		state.setL1Block(this.start, BlockType.None)
		state.setL1Block(this.end, BlockType.Box)
	}
	undo(state: BoardState): void {
		state.setL1Block(this.start, BlockType.Box)
		state.setL1Block(this.end, BlockType.None)
	}
}

export class CrushPlayer implements Command {
	type = CommandType.CrushPlayer;
	execute(state: BoardState): void {
		state.playerAlive = false;
	}
	undo(state: BoardState): void {
		state.playerAlive = true;
	}
}

/*
class PushBox implements Command {
	type = CommandType.DropBox;
	start: V2;
	end: V2;
	constructor(start: V2, end: V2) {
		this.start = start;
		this.end = end;
	}
	execute(state: BoardState): void {
		state.isCarryingBox = false;
		state.setL1Block(this.end, BlockType.Box)
	}
	undo(state: BoardState): void {
		state.isCarryingBox = true;
		state.setL1Block(this.end, BlockType.None);
	}
}*/



class BoardState {
	l1Blocks: BlockType[][];
	l2Blocks: BlockType[][];
	inventory: Map<BlockType, number> = new Map();
	playerFacingRight: boolean = true;
	isCarryingBox: boolean = false;
	playerAlive: boolean = true;
	playerPos: V2;
	mapSize: V2;
	moves: Move[] = [];
	
	private _l2OnlyTypes = new Set<BlockType>([BlockType.Key, BlockType.Pickhammer, BlockType.Gem, BlockType.Ladder]);

	constructor(playerPos: V2, mapSize: V2) {
		this.playerPos = playerPos;
		this.mapSize = mapSize;
		this.inventory.set(BlockType.BoxLifter, 0);
		this.inventory.set(BlockType.Pickhammer, 0);
		this.inventory.set(BlockType.Key, 0);
		this.inventory.set(BlockType.Gem, 0);
		this.inventory.set(BlockType.Ladder, 0);
		this.inventory.set(BlockType.Brick, 0);
	}

	getL1Block(pos: V2): BlockType {
		return this.l1Blocks[pos.x][pos.y];
	}
	getL2Block(pos: V2): BlockType {
		return this.l2Blocks[pos.x][pos.y];
	}
	setL1Block(pos: V2, blockType: BlockType): void {
		console.assert(IsL1Type(blockType));
		this.l1Blocks[pos.x][pos.y] = blockType;
	}
	setL2Block(pos: V2, blockType: BlockType): void {
		console.assert(IsL2Type(blockType));
		this.l2Blocks[pos.x][pos.y] = blockType;
	}
	setBlock(pos: V2, blockType: BlockType): void {
		if (blockType == BlockType.None) {
			this.setL1Block(pos, BlockType.None);
			this.setL2Block(pos, BlockType.None);
		}
		else {
			if (L2OnlyTypes.has(blockType)) {
				this.setL2Block(pos, blockType);
			}
			else {
				this.setL1Block(pos, blockType);
			}
		}
	}

	// Sets either L1 or L2 to none based on whether blockType would be in L1 or L2
	setNoneForType(pos: V2, blockType: BlockType): void {
		if (L2OnlyTypes.has(blockType)) {
			this.setL2Block(pos, BlockType.None);
		}
		else {
			this.setL1Block(pos, BlockType.None);
		}
	}

	addToInventory(blockType: BlockType, amount: number)
	{
		let newAmount = this.inventory.get(blockType) + amount;
		console.assert(newAmount >= 0);
		this.inventory.set(blockType, newAmount);
	}

	incInventory(blockType: BlockType) { this.addToInventory(blockType, 1); }

	decInventory(blockType: BlockType) { this.addToInventory(blockType, -1); }
}

export interface IBoardStateProvider {
	getL1Block(pos: V2): BlockType
	getL2Block(pos: V2): BlockType
	setL1Block(pos: V2, blockType: BlockType): void
	setL2Block(pos: V2, blockType: BlockType): void
}


export class BoardLogic {
	state: BoardState;

	private _solidTypes: Set<BlockType>;
	private _ladderTypes: Set<BlockType>;
	private _boxTypes: Set<BlockType>;
	private _pickupTypes: Set<BlockType>;
	private _mineableTypes: Set<BlockType>;

	constructor(playerPos: V2, mapSize: V2)
	{
		this.state = new BoardState(playerPos, mapSize);

		this._solidTypes = new Set<BlockType>([BlockType.Brick, BlockType.HardBlock, BlockType.LockedDoor, BlockType.Trap1, BlockType.Trap2, BlockType.Box]);
		this._boxTypes = new Set<BlockType>([BlockType.Box]);
		this._ladderTypes = new Set<BlockType>([BlockType.Ladder, BlockType.HardLadder]);
		this._pickupTypes = new Set<BlockType>([BlockType.Key, BlockType.Pickhammer, BlockType.Gem, BlockType.BoxLifter]);
		this._mineableTypes = new Set<BlockType>([BlockType.Brick, BlockType.Ladder]);
	}

	turnAround(): Move
	{
		let move = new Move();
		if (!this.state.playerAlive) return move;

		move.setExecuteFirst(new MovePlayer(this.state.playerPos,this.state.playerPos, !this.state.playerFacingRight, this.state.playerFacingRight), this.state);
		this.state.moves.push(move);
		return move;
	}

	tryMovePlayer(dir: V2): Move
	{
		let move = new Move();
		if (!this.state.playerAlive) return move;

		const originalPlayerPos = this.state.playerPos.clone();
		const moveToPos = this.state.playerPos.add(dir);

		let playerFacingRight = this.state.playerFacingRight;
		const isMoveLeftOrRight = this.state.playerPos.x != moveToPos.x;
		if (isMoveLeftOrRight)
		{
			playerFacingRight = moveToPos.x > this.state.playerPos.x;
		}

		if (this._isSolidAt(moveToPos)) {
			// Move is only to change direction facing
			if (this.state.playerFacingRight != playerFacingRight)
			{
				move.setExecuteFirst(new MovePlayer(this.state.playerPos, this.state.playerPos, playerFacingRight, this.state.playerFacingRight), this.state);
				this.state.moves.push(move);
			}
			return move;
		}

		// todo: Can we push boxes???



		if (isMoveLeftOrRight) {
			move.setExecuteFirst(new MovePlayer(this.state.playerPos, moveToPos, playerFacingRight, this.state.playerFacingRight), this.state);
			this._playerFallAndPickup(move);

			if (this.state.isCarryingBox && this._isSolidAt(moveToPos.up))
			{
				this._dropBox(originalPlayerPos.up, move);
			}
		}
		else if (moveToPos.y > this.state.playerPos.y || this._isLadderAt(this.state.playerPos))
		{
			if (this.state.isCarryingBox && this._isSolidAt(moveToPos.up))
			{
				// Cannot climb up because we are holding a box
			}
			else
			{
				move.setExecuteFirst(new MovePlayer(this.state.playerPos, moveToPos, playerFacingRight, this.state.playerFacingRight), this.state);
				this._playerFallAndPickup(move);
			}
		}
		else {
			// No ladder to climb up
		}

		if (move.isValid()) this.state.moves.push(move);
		return move;
	}

	undoLastMove(): Move
	{
		const move = this.state.moves.pop();
		if (move == undefined) return null;

		for (let i: number = move.secondCommands.length - 1; i >= 0; --i) {
			move.secondCommands[i].undo(this.state);
		}
		move.firstCommand.undo(this.state);

		return move;
	}

	positionsForInventoryItem(inventoryItem: BlockType): V2[]
	{
		let positions:V2[] = [];
		if (inventoryItem == BlockType.BoxLifter) {
			const left = this.state.playerPos.left;
			const right = this.state.playerPos.right;
			const leftUp = left.up;
			const rightUp = right.up;

			if (this.state.isCarryingBox)
			{
				
				if (!this._isSolidAt(leftUp)) positions.push(leftUp);
				if (!this._isSolidAt(rightUp)) positions.push(rightUp);
			}
			else
			{
				if (!this._isSolidAt(this.state.playerPos.up)) {
					if (!this._isSolidAt(leftUp) && this._boxTypes.has(this.state.getL1Block(left)))
					{
						positions.push(left);
					}
					if (!this._isSolidAt(rightUp) && this._boxTypes.has(this.state.getL1Block(right)))
					{
						positions.push(right);
					}
				}
			}

			return positions;
		}

		let adjacentPositions = this._adjacentInboundPositions(this.state.playerPos);
		if (inventoryItem == BlockType.Pickhammer) {
			for (let p of adjacentPositions) {
				let b1 = this.state.getL1Block(p);
				let b2 = this.state.getL2Block(p);
				if (this._mineableTypes.has(b1) || this._mineableTypes.has(b2)) {
					positions.push(p);
				}
			}
		}
		else if (inventoryItem == BlockType.Key) {
			for (let p of adjacentPositions) {
				let b1 = this.state.getL1Block(p);
				if (b1 == BlockType.LockedDoor) {
					positions.push(p);
				}
			}
		}
		else if (inventoryItem == BlockType.Brick || inventoryItem == BlockType.Ladder) {
			for (let p of adjacentPositions) {
				let b1 = this.state.getL1Block(p);
				let b2 = this.state.getL2Block(p);
				if (b1 == BlockType.None && b2 == BlockType.None) {
					positions.push(p);
				}
			}
		}

		return positions;
	}

	useInventoryItem(inventoryItem: BlockType, pos: V2): Move
	{
		// We assume it has been validated
		let move = new Move();
		if (!this.state.playerAlive) return move;


		if (inventoryItem == BlockType.BoxLifter) {
			//this.dropOrPickupBox(move, pos);

			if (this.state.isCarryingBox)
			{
				this._dropBox(pos, move);
			}
			else 
			{
				move.setExecuteFirst(new PickupBox(pos), this.state);
			}
		}
		else if (inventoryItem == BlockType.Pickhammer) {
			let b = this.state.getL1Block(pos);

			if (!this._mineableTypes.has(b)) {
				b = this.state.getL2Block(pos);
			}

			move.setExecuteFirst(new MineBlock(pos, b), this.state);

			// Fall boxes above
			this._fallBoxesAbove(pos, move);

			if (this.state.getL1Block(this.state.playerPos) == BlockType.Box) {
				move.addExecuteSecond(new CrushPlayer(), this.state);
			}
		}
		else if (inventoryItem == BlockType.Ladder || inventoryItem == BlockType.Brick) {
			move.setExecuteFirst(new PlaceBlock(pos, inventoryItem), this.state);
		}

		if (inventoryItem != BlockType.BoxLifter) {
			this._playerFallAndPickup(move);
		}

		if (move.isValid()) this.state.moves.push(move);
		return move;
	}

	isL2OnlyBlock(blockType: BlockType): boolean
	{
		return L2OnlyTypes.has(blockType);
	}
	

	_adjacentInboundPositions(pos: V2): V2[]
	{
		let positions:V2[] = [];
		const playerPosUp = this.state.playerPos.up;

		for (let p of pos.adjacentPositions) {
			if (this.state.isCarryingBox && p == playerPosUp) continue;

			if (this._isOutOfBounds(p)) continue;
			
			positions.push(p);
		}

		return positions;
	}

	_dropBox(pos: V2, move: Move): void
	{
		const startPos = pos.clone();
		while (true)
		{
			const nextPos = pos.add(V2.DOWN)
			if (this._isSolidAt(nextPos)) break;
			pos = nextPos;
		}

		move.addExecute(new DropBox(startPos, pos), this.state);
	}
	
	_fallBoxesAbove(pos: V2, move: Move): void
	{
		let boxPositions: V2[] = [];
		let existingPos = pos.up;

		while (this.state.getL1Block(existingPos) == BlockType.Box) {
			boxPositions.push(existingPos);
			existingPos = existingPos.up;
		}

		if (boxPositions.length > 0)
		{
			let landingPos = this._getBoxLandingPos(pos);
			for (let start of boxPositions)
			{
				move.addExecuteSecond(new FallBox(start, landingPos), this.state);
				landingPos = landingPos.up;
			}
		}
	}

	_getBoxLandingPos(pos: V2): V2 {
		while (true)
		{
			const nextPos = pos.down;
			if (this._isSolidAt(nextPos)) break;
			pos = nextPos;
		}
		return pos;
	}

	_isOutOfBounds(pos: V2): boolean
	{
		return pos.x < 0 || pos.y < 0 || pos.x >= this.state.mapSize.x || pos.y >= this.state.mapSize.y;
	}

	_isSolidAt(pos: V2): boolean
	{
		if (this._isOutOfBounds(pos)) return true;

		const blockType = this.state.getL1Block(pos);
		return this._solidTypes.has(blockType);
	}

	_isLadderAt(pos: V2): boolean
	{
		const blockType = this.state.getL2Block(pos);
		return this._ladderTypes.has(blockType);
	}

	_playerFallAndPickup(move: Move): V2
	{
		let pos = this.state.playerPos;

		if (this._isLadderAt(pos)) return pos;

		while (true)
		{
			const l2 = this.state.getL2Block(pos);
			if (this._pickupTypes.has(l2)) {
				move.addExecuteSecond(new PickupItem(pos, l2), this.state);
			}

			const nextPos = pos.add(V2.DOWN)
			if (this._isSolidAt(nextPos) || this._isLadderAt(nextPos)) break;
			pos = nextPos;
		}

		if (this.state.playerPos.y != pos.y) {
			move.addExecuteSecond(new FallPlayer(this.state.playerPos, pos), this.state);
		}

		return pos;
	}
}
