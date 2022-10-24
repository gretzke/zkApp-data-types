import {
  DeployArgs,
  Field,
  method,
  Permissions,
  SmartContract,
} from 'snarkyjs';

import { DynamicArray } from './dynamicArray';

export class FieldArray extends DynamicArray(Field, 8) {}

export class DataTypes extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method get(arr: FieldArray, index: Field, value: Field) {
    arr.get(index).assertEquals(value);
    arr.map((x: Field) => x.mul(Field(2)));
  }

  @method set(arr: FieldArray, index: Field, value: Field, newHash: Field) {
    arr.set(index, value);
    arr.hash().assertEquals(newHash);
  }

  @method push(arr: FieldArray, value: Field, newHash: Field) {
    arr.push(value);
    arr.hash().assertEquals(newHash);
  }

  @method pop(arr: FieldArray, amount: Field, newHash: Field) {
    arr.pop(amount);
    arr.hash().assertEquals(newHash);
  }

  @method concat(arr: FieldArray, other: FieldArray, newHash: Field) {
    const newArr = arr.concat(other);
    newArr.hash().assertEquals(newHash);
  }

  @method insert(arr: FieldArray, index: Field, value: Field, newHash: Field) {
    arr.insert(index, value);
    arr.hash().assertEquals(newHash);
  }

  @method exists(arr: FieldArray, value: Field) {
    arr.assertExists(value);
  }
}
