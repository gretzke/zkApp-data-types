import { Bool, Character, Circuit, Field } from 'snarkyjs';
import { DynamicArray } from './dynamicArray';

export function parseJSON(json: string) {
  // minify json
  json = JSON.stringify(JSON.parse(json));

  class JSONParser extends DynamicArray(Character, json.length) {
    static from(values: Character[]): JSONParser {
      return new JSONParser(values);
    }

    public constructor(values?: Character[]) {
      super(values);
    }

    // [ { value: '91' }
    // ] { value: '93' }
    // { { value: '123' }
    // } { value: '125' }
    // , { value: '44' }
    // : { value: '58' }
    // " { value: '34' }
    // \ { value: '92' }
    public index(at: Field): JSONParser {
      this.get(Field(0)).assertEquals(Field(91));
      this.get(this.length.sub(1)).assertEquals(Field(93));
      let index = Field(-1);
      let newIndex = Bool(true);
      let depth = Field(0);
      let insideString = Bool(false);
      let start = Field(0);
      let end = Field(0);
      for (let i = 1; i < this.maxLength() - 1; i++) {
        const val = this.values[i];
        insideString = Circuit.if(
          val.equals(Field(34)).and(this.values[i - 1].equals(Field(92)).not()),
          insideString.not(),
          insideString
        );
        depth = Circuit.if(
          insideString
            .not()
            .and(val.equals(Field(91)).or(val.equals(Field(123)))),
          depth.add(1),
          depth
        );
        depth = Circuit.if(
          insideString
            .not()
            .and(val.equals(Field(93)).or(val.equals(Field(125)))),
          depth.sub(1),
          depth
        );
        index = index.add(newIndex.toField());
        start = Circuit.if(index.equals(at).and(newIndex), start.add(i), start);
        end = Circuit.if(
          index.equals(at.add(1)).and(newIndex),
          end.add(i).sub(Field(1)),
          end
        );
        newIndex = val.equals(Field(44)).and(depth.equals(Field(0)));
      }
      start
        .equals(Field(0))
        .and(end.equals(Field(0)))
        .assertFalse('Index out of bounds');
      end = Circuit.if(end.equals(Field(0)), this.length.sub(1), end);
      return this.slice(start, end);
    }

    public key(key: string): JSONParser {
      this.get(Field(0)).assertEquals(Field(123));
      this.get(this.length.sub(1)).assertEquals(Field(125));
      const keyHash = DynamicArray(Character, this.values.length)
        .from(key.split('').map((c) => Character.fromString(c)))
        .hash();

      let depth = Field(0);
      let keyFound = Bool(false);
      let insideString = Bool(false);
      let keyStart = Field(0);
      let start = Field(0);
      let end = Field(0);
      for (let i = 1; i < this.maxLength() - 1; i++) {
        const val = this.values[i];
        depth = Circuit.if(
          insideString.not().and(
            val
              .equals(Field(58))
              .and(depth.equals(Field(0)))
              .or(val.equals(Field(91)).or(val.equals(Field(123))))
          ),
          depth.add(1),
          depth
        );
        depth = Circuit.if(
          insideString.not().and(
            val
              .equals(Field(44))
              .and(depth.equals(Field(1)))
              .or(val.equals(Field(93)).or(val.equals(Field(125))))
          ),
          depth.sub(1),
          depth
        );
        keyStart = Circuit.if(
          insideString
            .and(depth.equals(Field(0)))
            .and(keyStart.equals(Field(0))),
          Field(i),
          keyStart
        );
        const keyEnd = Circuit.if(
          insideString.and(depth.equals(Field(0))).and(val.equals(Field(34))),
          Field(i),
          Field(0)
        );
        const keyIdentified = keyStart
          .equals(Field(0))
          .or(keyEnd.equals(Field(0)))
          .not();

        keyFound = Circuit.if(
          keyIdentified,
          this.slice(
            keyStart,
            Circuit.if(keyIdentified.not(), keyStart, keyEnd)
          )
            .hash()
            .equals(keyHash),
          keyFound
        );
        start = Circuit.if(
          keyFound
            .and(val.equals(Field(58)).not())
            .and(depth.equals(Field(0)).not())
            .and(start.equals(Field(0))),
          Field(i),
          start
        );
        end = Circuit.if(
          keyFound
            .and(depth.equals(Field(0)))
            .and(start.equals(Field(0)).not())
            .and(end.equals(Field(0))),
          Field(i),
          end
        );
        keyStart = Circuit.if(
          keyEnd.equals(Field(0)).not(),
          Field(0),
          keyStart
        );
        insideString = Circuit.if(
          val.equals(Field(34)).and(this.values[i - 1].equals(Field(92)).not()),
          insideString.not(),
          insideString
        );
      }
      start
        .equals(Field(0))
        .and(end.equals(Field(0)))
        .assertFalse(`Key "${key}" not found`);
      end = Circuit.if(end.equals(Field(0)), this.length.sub(1), end);
      return this.slice(start, end);
    }

    public toNumber(): Field {
      let result = Field(0);
      let masked = Bool(true);
      for (let i = 0; i < this.maxLength(); i++) {
        masked = Circuit.if(Field(i).equals(this.length), Bool(false), masked);
        const val = toDigit(this.values[i]);
        result = Circuit.if(
          masked,
          result.add(
            val.mul(power(Field(10), this.length.sub(Field(i).add(1))))
          ),
          result
        );
      }
      return result;
    }

    public toBoolean(): Bool {
      const trueAsFields = DynamicArray(Character, this.values.length)
        .from('true'.split('').map((c) => Character.fromString(c)))
        .hash();
      const falseAsFields = DynamicArray(Character, this.values.length)
        .from('false'.split('').map((c) => Character.fromString(c)))
        .hash();
      this.hash()
        .equals(trueAsFields)
        .or(this.hash().equals(falseAsFields))
        .assertTrue('Not a boolean');
      return this.hash().equals(trueAsFields);
    }

    public assertEqualString(expected: string) {
      const expectedAsFields = DynamicArray(Character, this.values.length).from(
        expected.split('').map((c) => Character.fromString(c))
      );
      this.hash().equals(expectedAsFields.hash()).assertTrue();
    }
  }
  return JSONParser.from(json.split('').map((c) => Character.fromString(c)));
}

function toDigit(c: Character): Field {
  const val = c.toField();
  // val
  //   .gte(Field(48))
  //   .and(val.lte(Field(57)))
  //   .or(val.equals(Field(0)))
  //   .assertTrue('Not a digit');
  return val.sub(Field(48));
}

function power(base: Field, exp: Field): Field {
  const maxPower = 10;
  // exp.assertLte(Field(maxPower), 'exceeds max power');
  let result = Field(1);
  let masked = Bool(true);
  for (let i = 1; i <= maxPower; i++) {
    masked = Circuit.if(Field(i).equals(exp), Bool(false), masked);
    result = Circuit.if(masked, result.mul(base), result);
  }
  return result;
}
