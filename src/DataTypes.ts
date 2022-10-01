import {
  Field,
  SmartContract,
  state,
  State,
  method,
  DeployArgs,
  Permissions,
} from 'snarkyjs';

import { CircuitDynamicArray } from './dynamicArray';

export class DataTypes extends SmartContract {
  @state(Field) num = State<Field>();

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
    });
  }

  @method dynamicArrayGet(dynamicArr: CircuitDynamicArray, index: Field) {
    dynamicArr.get(index).assertEquals(Field(1));
  }

  @method update() {
    // test init state
    let dynamicArr = CircuitDynamicArray.fromFields([
      Field(0),
      Field(2),
      Field(1),
    ]);
    this.num.get().assertEquals(dynamicArr.get(Field(2)));
    //
    const currentState = this.num.get();
    this.num.assertEquals(currentState); // precondition that links this.num.get() to the actual on-chain state
    const newState = currentState.add(2);
    newState.assertEquals(currentState.add(2));
    this.num.set(newState);
  }
}
