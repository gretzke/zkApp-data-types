import { Bool, Circuit, Field, Poseidon, Provable, Struct } from 'snarkyjs';

export { DynamicArray };

type HashableProvable<T> = Provable<T> & {
  hash(x: T): Field;
  equals(x: T, other: T): Bool;
};

function hashable<T>(type: Provable<T>): HashableProvable<T> {
  return {
    ...type,
    hash(x: T): Field {
      return Poseidon.hash(type.toFields(x));
    },
    equals(x: T, other: T): Bool {
      return this.hash(x).equals(this.hash(other));
    },
  };
}

function DynamicArray<T>(type: Provable<T>, maxLength: number) {
  const _type = hashable(type);
  function Null() {
    return type.fromFields(
      Array(type.sizeInFields()).fill(Field.zero),
      type.toAuxiliary()
    );
  }
  return class _DynamicArray extends Struct({
    length: Field,
    values: Circuit.array(type, maxLength),
  }) {
    static from(values: T[]): _DynamicArray {
      const arr = new _DynamicArray();
      for (let i = 0; i < values.length; i++) {
        arr.push(values[i]);
      }
      return arr;
    }

    static empty(length?: Field): _DynamicArray {
      const arr = new _DynamicArray();
      arr.length = length ?? Field.zero;
      return arr;
    }

    public constructor() {
      super({
        values: fillWithNull([], maxLength),
        length: Field.zero,
      });
    }

    public get(index: Field): T {
      const mask = this.indexMask(index);
      return Circuit.switch(mask, type, this.values);
    }

    public set(index: Field, value: T): void {
      const mask = this.indexMask(index);
      for (let i = 0; i < maxLength; i++) {
        this.values[i] = Circuit.if(mask[i], value, this.values[i]);
      }
    }

    public push(value: T): void {
      this.incrementLength(Field.one);
      this.set(this.length.sub(1), value);
    }

    public pop(n: Field): void {
      const mask = this.lengthMask(this.length.sub(n));
      this.decrementLength(n);

      for (let i = 0; i < maxLength; i++) {
        this.values[i] = Circuit.if(mask[i], this.values[i], Null());
      }
    }

    public concat(other: _DynamicArray): _DynamicArray {
      // TODO: assert max length and type compatibility
      const newArr = other.copy();
      newArr.shiftRight(this.length);
      for (let i = 0; i < maxLength; i++) {
        newArr.values[i] = Circuit.if(
          Field(i).lt(this.length),
          this.values[i],
          newArr.values[i]
        );
      }
      return newArr;
    }

    public copy(): _DynamicArray {
      const newArr = new _DynamicArray();
      newArr.values = this.values.slice();
      newArr.length = this.length;
      return newArr;
    }

    public slice(start: Field, end: Field): _DynamicArray {
      const newArr = this.copy();
      newArr.shiftLeft(start);
      newArr.pop(newArr.length.sub(end.sub(start)));
      return newArr;
    }

    public insert(index: Field, value: T): void {
      const arr1 = this.slice(Field.zero, index);
      const arr2 = this.slice(index, this.length);
      arr2.shiftRight(Field.one);
      arr2.set(Field.zero, value);
      const concatArr = arr1.concat(arr2);
      this.values = concatArr.values;
      this.length = concatArr.length;
    }

    public assertExists(value: T): void {
      let result = Field.zero;
      for (let i = 0; i < maxLength; i++) {
        result = result.add(
          Circuit.if(_type.equals(this.values[i], value), Field.one, Field.zero)
        );
      }
      result.assertGt(Field.zero);
    }

    public shiftLeft(n: Field): void {
      n.assertLt(this.length);
      this.decrementLength(n);

      const nullArray = _DynamicArray.empty(n);

      const possibleResults = [];
      const mask = [];
      for (let i = 0; i < maxLength; i++) {
        possibleResults[i] = this.values
          .slice(i, maxLength)
          .concat(nullArray.values.slice(0, i));
        mask[i] = Field(i).equals(n);
      }

      const result = [];
      for (let i = 0; i < maxLength; i++) {
        const possibleFieldsAtI = possibleResults.map((r) => r[i]);
        result[i] = Circuit.switch(mask, type, possibleFieldsAtI);
      }
      this.values = result;
    }

    public shiftRight(n: Field): void {
      const nullArray = _DynamicArray.empty(n);
      this.incrementLength(n);

      const possibleResults = [];
      const mask = [];
      for (let i = 0; i < maxLength; i++) {
        possibleResults[i] = nullArray.values
          .slice(0, i)
          .concat(this.values.slice(0, maxLength - i));
        mask[i] = Field(i).equals(nullArray.length);
      }

      const result = [];
      for (let i = 0; i < maxLength; i++) {
        const possibleFieldsAtI = possibleResults.map((r) => r[i]);
        result[i] = Circuit.switch(mask, type, possibleFieldsAtI);
      }
      this.values = result;
    }

    public hash(): Field {
      return Poseidon.hash(this.values.map((v) => type.toFields(v)).flat());
    }

    public toString(): string {
      return this.values.slice(0, parseInt(this.length.toString())).toString();
    }

    public indexMask(index: Field): Bool[] {
      // assert index < length
      index.assertLt(this.length);
      const mask = [];
      for (let i = 0; i < maxLength; i++) {
        mask[i] = Field(i).equals(index);
      }
      return mask;
    }

    public incrementLength(n: Field): void {
      this.length.add(n).assertLte(maxLength);
      this.length = this.length.add(n);
    }

    public decrementLength(n: Field): void {
      n.assertLte(this.length);
      this.length = this.length.sub(n);
    }

    public lengthMask(n: Field): Bool[] {
      const mask = [];
      for (let i = 0; i < maxLength; i++) {
        mask[i] = Field(i).lt(n);
      }
      return mask;
    }

    public map(fn: (_: T) => T): void {
      for (let i = 0; i < this.values.length; i++) {
        this.values[i] = Circuit.if(
          Field(i).lt(this.length),
          fn(this.values[i]),
          Null()
        );
      }
    }
  };

  function fillWithNull([...values]: T[], length: number): T[] {
    for (let i = values.length; i < length; i++) {
      values[i] = Null();
    }
    return values;
  }
}
