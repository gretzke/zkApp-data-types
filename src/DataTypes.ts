import {
  DeployArgs,
  Field,
  method,
  Permissions,
  SmartContract,
} from 'snarkyjs';

import { CircuitDynamicArray } from './dynamicArray';

export class DataTypes extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method get(arr: CircuitDynamicArray, index: Field, value: Field) {
    arr.get(index).assertEquals(value);
  }

  @method set(
    arr: CircuitDynamicArray,
    index: Field,
    value: Field,
    newHash: Field
  ) {
    arr.set(index, value);
    arr.hash().assertEquals(newHash);
  }

  @method push(arr: CircuitDynamicArray, value: Field, newHash: Field) {
    arr.push(value);
    arr.hash().assertEquals(newHash);
  }

  @method pop(arr: CircuitDynamicArray, amount: Field, newHash: Field) {
    arr.pop(amount);
    arr.hash().assertEquals(newHash);
  }

  @method concat(
    arr: CircuitDynamicArray,
    other: CircuitDynamicArray,
    newHash: Field
  ) {
    const newArr = arr.concat(other);
    newArr.hash().assertEquals(newHash);
    newArr.insert(Field(0), Field(9));
  }

  @method insert(
    arr: CircuitDynamicArray,
    index: Field,
    value: Field,
    newHash: Field
  ) {
    arr.insert(index, value);
    arr.hash().assertEquals(newHash);
  }

  @method exists(arr: CircuitDynamicArray, value: Field) {
    arr.assertExists(value);
  }
}
