import { arrayProp, CircuitValue, Field, Poseidon } from 'snarkyjs';

export { CircuitDynamicArray };

const MAX_LEN = 2 ** 8;

class CircuitDynamicArray extends CircuitValue {
  static maxLength = MAX_LEN;
  @arrayProp(Field, MAX_LEN) public values: Field[];

  static fromFields(fields: Field[]): CircuitDynamicArray {
    return new CircuitDynamicArray(fields);
  }

  private constructor(values: Field[]) {
    const length = Field(values.length);
    super(fillWithNull([length, ...values], CircuitDynamicArray.maxLength));
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

  hash(): Field {
    return Poseidon.hash(this.values);
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
    const currentLength = this.length();
    this.values[0] = this.length().add(n);
    this.length().assertEquals(currentLength.add(n));
  }

  private decrementLength(n: Field): void {
    const currentLength = this.length();
    this.values[0] = this.length().sub(n);
    this.length().assertEquals(currentLength.sub(n));
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
