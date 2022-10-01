import { arrayProp, Circuit, CircuitValue, Field } from 'snarkyjs';

export { CircuitDynamicArray };

const MAX_LEN = 2 ** 8;

class CircuitDynamicArray extends CircuitValue {
  static maxLength = MAX_LEN;
  @arrayProp(Field, MAX_LEN) private values: Field[];

  private constructor(values: Field[]) {
    const length = Field(values.length);
    super(fillWithNull([length, ...values], CircuitDynamicArray.maxLength));
  }

  public length(): Field {
    return this.values[0];
  }

  public get(index: Field): Field {
    // assert index < length
    index.assertLt(this.length());
    let mask = [];
    for (let i = 0; i < CircuitDynamicArray.maxLength; i++) {
      let isIndex = Circuit.if(
        Field(i).equals(index.add(1)),
        Field(1),
        Field(0)
      );
      mask[i] = isIndex;
    }
    let result = Field(0);
    for (let i = 1; i < CircuitDynamicArray.maxLength; i++) {
      result = result.add(this.values[i].mul(mask[i]));
    }
    return result;
  }

  public append(value: Field): void {
    this.values[this.values.length] = value;
  }

  static fromFields(fields: Field[]): CircuitDynamicArray {
    return new CircuitDynamicArray(fields);
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
