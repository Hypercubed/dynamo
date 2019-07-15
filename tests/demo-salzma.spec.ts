/*
 * Example adapted from:
 * Salzman L., Aldrich J. (2005) Prototypes with Multiple Dispatch: An Expressive and Dynamic Object Model.
 * In: Black A.P. (eds) ECOOP 2005 - Object-Oriented Programming. ECOOP 2005.
 * Lecture Notes in Computer Science, vol 3586. Springer, Berlin, Heidelberg
 */

import test from 'ava';

import { signature, Dynamo, guard } from '../src';

const dynamo = new Dynamo({ types: false, autoadd: true });

abstract class Animal {
  @guard()
  static isAnimal(x: unknown): x is Fish {
    return x instanceof Animal;
  }
  type: string;
}

class Fish extends Animal {
  @guard()
  static isFish(x: unknown): x is Fish {
    return x instanceof Fish;
  }
  type = 'fish';
}

// tslint:disable-next-line: variable-name
const HealthyShark = {} as any as ObjectConstructor;
type HealthyShark = Shark;

class Shark extends Animal {
  @guard()
  static isShark(x: unknown): x is Shark {
    return x instanceof Shark;
  }

  @guard(HealthyShark)
  static isHealthy(x: Shark): x is HealthyShark {
    return x.healthy;
  }

  type = 'shark';
  healthy = true;
}

function swimAway(animal: Animal): string {
  return `${animal.type} swims away`;
}

function swallow(animal: Shark, other: Fish): string {
  animal.healthy = true;
  return `${animal.type} swallow ${other.type}`;
}

function fight(animal: HealthyShark, other: Shark): string {
  animal.healthy = false;
  return `${animal.type} attacks ${other.type}`;
}

class Encounter {
  @signature()
  fishEncounter(animal: Fish, other: Animal): string {
    return swimAway(animal);
  }

  @signature()
  sharkFishEncounter(animal: Shark, other: Fish): string {
    return swallow(animal, other);
  }

  @signature()
  healthySharkSharkEncounter(animal: HealthyShark, other: Shark): string {
    return fight(animal, other);
  }

  @signature()
  sharkSharkEncounter(animal: Shark, other: Shark): string {
    return swimAway(animal);
  }
}

const encounter = dynamo.function(Encounter);

test('encounter', t => {
  const fish = new Fish();
  const shark = new Shark();

  t.is(encounter(fish, new Fish()), 'fish swims away');

  t.is(encounter(shark, new Shark()), 'shark attacks shark');
  t.is(encounter(shark, new Shark()), 'shark swims away');
  t.is(encounter(shark, new Fish()), 'shark swallow fish');
  t.is(encounter(shark, new Shark()), 'shark attacks shark');
});
