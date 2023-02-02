
export class V2 {
	x: number;
	y: number;

	constructor(x: number, y: number)
	{
		this.x = x;
		this.y = y;
	}

	clone() { return new V2(this.x, this.y); }
	
	add(v: V2): V2 { return new V2(this.x + v.x, this.y + v.y); }
	sub(v: V2): V2 { return new V2(this.x - v.x, this.y - v.y); }
    equals(v: V2): boolean { return this.x == v.x && this.y == v.y; }

	get right(): V2 { return new V2(this.x + 1, this.y); }
	get left(): V2  { return new V2(this.x - 1, this.y); }
	get up(): V2    { return new V2(this.x, this.y - 1); }
	get down(): V2  { return new V2(this.x, this.y + 1); }

	get rightup(): V2 { return new V2(this.x + 1, this.y - 1); }
	get leftup(): V2 { return new V2(this.x - 1, this.y - 1); }
	get rightdown(): V2 { return new V2(this.x + 1, this.y + 1); }
	get leftdown(): V2 { return new V2(this.x - 1, this.y + 1); }

	get adjacentPositions(): V2[]
	{
        return [this.right, this.left, this.up, this.down, this.rightup, this.leftup, this.rightdown, this.leftdown];
	}

    toString(): string {
        return this.x + ',' + this.y;
    }

	/**
	 * A static right Vector2 for use by reference.
	 * 
	 * This constant is meant for comparison operations and should not be modified directly.
	 */
	static readonly RIGHT: V2 = new V2(1, 0);

	/**
	 * A static left Vector2 for use by reference.
	 * 
	 * This constant is meant for comparison operations and should not be modified directly.
	 */
	static readonly LEFT: V2 = new V2(-1, 0);

	/**
	 * A static up Vector2 for use by reference.
	 * 
	 * This constant is meant for comparison operations and should not be modified directly.
	 */
	static readonly UP: V2 = new V2(0, -1);

	/**
	 * A static down Vector2 for use by reference.
	 * 
	 * This constant is meant for comparison operations and should not be modified directly.
	 */
	static readonly DOWN: V2 = new V2(0, 1);
}
