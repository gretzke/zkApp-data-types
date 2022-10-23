import {
  DeployArgs,
  Field,
  method,
  Permissions,
  SmartContract,
} from 'snarkyjs';

import { DynamicArray } from './dynamicArray.js';

export class DataTypes extends SmartContract {
  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method get(arr: Field[], index: Field, value: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    dynamicArr.get(index).assertEquals(value);
    dynamicArr.map((x: Field) => x.mul(Field(2)));
  }

  @method set(arr: Field[], index: Field, value: Field, newHash: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    dynamicArr.set(index, value);
    dynamicArr.hash().assertEquals(newHash);
  }

  @method push(arr: Field[], value: Field, newHash: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    dynamicArr.push(value);
    dynamicArr.hash().assertEquals(newHash);
  }

  @method pop(arr: Field[], amount: Field, newHash: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    dynamicArr.pop(amount);
    dynamicArr.hash().assertEquals(newHash);
  }

  @method concat(arr: Field[], other: Field[], newHash: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    const otherDynamicArr = DynamicArray(Field, 8).from(other);
    const newArr = dynamicArr.concat(otherDynamicArr);
    newArr.hash().assertEquals(newHash);
  }

  @method insert(arr: Field[], index: Field, value: Field, newHash: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    dynamicArr.insert(index, value);
    dynamicArr.hash().assertEquals(newHash);
  }

  @method exists(arr: Field[], value: Field) {
    const dynamicArr = DynamicArray(Field, 8).from(arr);
    dynamicArr.assertExists(value);
  }
}
