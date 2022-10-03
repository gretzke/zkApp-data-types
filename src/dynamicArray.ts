import {
  arrayProp,
  Bool,
  Circuit,
  CircuitValue,
  Field,
  Poseidon,
} from 'snarkyjs';

export { CircuitDynamicArray };

const MAX_LEN = 2 ** 4;

class CircuitDynamicArray extends CircuitValue {
  static maxLength = MAX_LEN;
  @arrayProp(Field, MAX_LEN) public values: Field[];

  static fromFields(fields: Field[]): CircuitDynamicArray {
    const arr = new CircuitDynamicArray();
    for (let i = 0; i < fields.length; i++) {
      arr.push(fields[i]);
    }
    return arr;
  }

  static empty(length: Field): CircuitDynamicArray {
    const arr = new CircuitDynamicArray();
    length.assertLte(arr.maxLength());
    arr.values[0] = length;
    return arr;
  }

  private constructor() {
    super(fillWithNull([], CircuitDynamicArray.maxLength));
    this.length().assertEquals(Field.zero);
  }

  public length(): Field {
    return this.values[0];
  }

  public get(index: Field): Field {
    let mask = this.indexMask(index);
    let result = Field(0);
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      result = result.add(this.values[i].mul(mask[i]));
    }
    return result;
  }

  public set(index: Field, value: Field): void {
    let mask = this.indexMask(index);
    const lengthBefore = this.length();
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      this.values[i] = this.values[i]
        .mul(Field.one.sub(mask[i]))
        .add(value.mul(mask[i]));
    }
    lengthBefore.assertEquals(this.length());
  }

  public push(value: Field): void {
    this.incrementLength(Field(1));
    this.set(this.length().sub(1), value);
  }

  public pop(): void {
    this.set(this.length().sub(1), Field.zero);
    this.decrementLength(Field(1));
  }

  public concat(other: CircuitDynamicArray): CircuitDynamicArray {
    const newLength = this.length().add(other.length());
    Field(this.maxLength()).assertGte(newLength);

    const newArr = other.slice();
    newArr.shiftRight(this.length());

    for (let i = 1; i < this.maxLength(); i++) {
      newArr.values[i] = this.values[i].add(newArr.values[i]);
    }

    return newArr;
  }

  public slice(): CircuitDynamicArray {
    const newArr = new CircuitDynamicArray();
    newArr.values = this.values.slice();
    this.length().assertEquals(newArr.length());
    return newArr;
  }

  hash(): Field {
    return Poseidon.hash(this.values);
  }

  private maxLength(): number {
    return (this.constructor as typeof CircuitDynamicArray).maxLength - 1;
  }

  private indexMask(index: Field): Field[] {
    // assert index < length
    index.assertLt(this.length());
    let mask = [];
    for (let i = 0; i < CircuitDynamicArray.maxLength; i++) {
      const isIndex = Field(i).equals(index.add(1)).toField();
      mask[i] = isIndex;
    }
    return mask;
  }

  private incrementLength(n: Field): void {
    this.values[0] = this.length().add(n);
  }

  private decrementLength(n: Field): void {
    this.values[0] = this.length().sub(n);
  }

  public shiftRight(n: Field): void {
    this.length().add(n).assertLt(this.maxLength());
    const nullArray = CircuitDynamicArray.empty(n);
    this.incrementLength(n);

    const possibleResults = [];
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      possibleResults[i - 1] = nullArray.values
        .slice(1, i)
        .concat(this.values.slice(1, CircuitDynamicArray.maxLength + 1 - i));
    }

    const lengthMask = [];
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      const isIndex = Field(i).equals(nullArray.length().add(1));
      lengthMask[i - 1] = isIndex;
    }

    const result = [];
    for (let i = 0; i < this.maxLength(); i++) {
      let possibleFieldsAtI = possibleResults.map((r) => r[i]);
      result[i] = Circuit.switch(lengthMask, Field, possibleFieldsAtI);
    }
    this.values = [this.values[0]].concat(result);
  }

  public static lengthMask(n: Field): Bool[] {
    let mask = [];
    for (let i = 0; i < CircuitDynamicArray.maxLength; i++) {
      const isField = Field(i).lte(n);
      mask[i] = isField;
    }
    return mask;
  }
}

let NullCharacter = () => Field.zero;

function fillWithNull([...values]: Field[], length: number) {
  let nullChar = NullCharacter();
  for (let i = values.length; i < length; i++) {
    values[i] = nullChar;
  }
  return values;
}
