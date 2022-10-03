import {
  arrayProp,
  Bool,
  Circuit,
  CircuitValue,
  Field,
  Poseidon,
} from 'snarkyjs';

export { CircuitDynamicArray };

const MAX_LEN = 2 ** 8;

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

  public pop(n: Field): void {
    n.assertLte(this.length());

    const mask = [];
    for (let i = 0; i < CircuitDynamicArray.maxLength; i++) {
      mask[i] = Field(i).lte(this.length().sub(n)).toField();
    }

    this.decrementLength(n);

    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      this.values[i] = this.values[i].mul(mask[i]);
    }
  }

  public concat(other: CircuitDynamicArray): CircuitDynamicArray {
    const newLength = this.length().add(other.length());
    Field(this.maxLength()).assertGte(newLength);
    const newArr = other.copy();
    newArr.shiftRight(this.length());
    for (let i = 1; i < this.maxLength(); i++) {
      newArr.values[i] = this.values[i].add(newArr.values[i]);
    }
    return newArr;
  }

  public copy(): CircuitDynamicArray {
    const newArr = new CircuitDynamicArray();
    newArr.values = this.values.slice();
    this.length().assertEquals(newArr.length());
    return newArr;
  }

  public slice(start: Field, end: Field): CircuitDynamicArray {
    const newArr = new CircuitDynamicArray();
    newArr.values = this.values.slice();
    this.length().assertEquals(newArr.length());
    newArr.shiftLeft(start);
    newArr.pop(newArr.length().sub(end.sub(start)));
    return newArr;
  }

  public insert(index: Field, value: Field): void {
    const lengthBefore = this.length();
    const arr1 = this.slice(Field.zero, index);
    const arr2 = this.slice(index, lengthBefore);
    arr2.shiftRight(Field.one);
    arr2.set(Field.zero, value);
    this.values = arr1.concat(arr2).values;
    this.length().assertEquals(lengthBefore.add(1));
  }

  public assertExists(value: Field) {
    const mask = [];
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      mask[i - 1] = this.values[i].equals(value).toField();
    }

    let result = Field.zero;
    for (let i = 0; i < mask.length; i++) {
      result = result.add(mask[i]);
    }

    result.assertGt(Field.zero);
  }

  public shiftLeft(n: Field): void {
    n.assertLt(this.length());
    const nullArray = CircuitDynamicArray.empty(n);

    const possibleResults = [];

    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      possibleResults[i - 1] = this.values
        .slice(i, CircuitDynamicArray.maxLength)
        .concat(nullArray.values.slice(1, i));
    }

    const mask = [];
    for (let i = 0; i < this.maxLength(); i++) {
      const isIndex = Field(i).equals(n);
      mask[i] = isIndex;
    }

    const newLength = this.length().sub(n);

    const result = [];
    for (let i = 0; i < this.maxLength(); i++) {
      let possibleFieldsAtI = possibleResults.map((r) => r[i]);
      result[i] = Circuit.switch(mask, Field, possibleFieldsAtI);
    }
    this.values = [newLength].concat(result);
  }

  public shiftRight(n: Field): void {
    this.length().add(n).assertLte(this.maxLength());
    const nullArray = CircuitDynamicArray.empty(n);
    this.incrementLength(n);

    const possibleResults = [];
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      possibleResults[i - 1] = nullArray.values
        .slice(1, i)
        .concat(this.values.slice(1, CircuitDynamicArray.maxLength + 1 - i));
    }

    const mask = [];
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      const isIndex = Field(i).equals(nullArray.length().add(1));
      mask[i - 1] = isIndex;
    }

    const result = [];
    for (let i = 0; i < this.maxLength(); i++) {
      let possibleFieldsAtI = possibleResults.map((r) => r[i]);
      result[i] = Circuit.switch(mask, Field, possibleFieldsAtI);
    }
    this.values = [this.values[0]].concat(result);
  }

  public hash(): Field {
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
