const fs = require("fs");

class Manager {
  constructor() {}
}

class ConstantManager extends Manager {
  constructor(datas) {
    super();
    this.gameName = datas.gameName;
  }
}

class MapManager extends Manager {
  constructor(datas) {
    super();
    this.id = datas.id;
    this.fields = {};

    datas.forEach((field) => {
      this.fields[`${field.fields[0]}_${field.fields[1]}`] = {
        id: field.id,
        x: field.fields[0],
        y: field.fields[1],
        canGo: field.fields[2],
        mapName: field.fields[3],
        description: field.fields[4],
        events: field.contents
      };
    });
  }

  getField(x, y) {
    return this.fields[`${x}_${y}`];
  }
}

class EventManager extends Manager {
  constructor(datas) {
    super();
    this.id = datas.id;
    this.events = {};

    datas.forEach((event) => {
      this.events[`${event.id}`] = {
        id: event.id,
        content: event.content,
        hp: event.hp,
        def: event.def,
        int: event.int,
        maxHP: event.maxHp,
        str: event.str
      };
    });
  }

  getEvent(id) {
    return this.events[`${id}`];
  }
}

class MonsterManager extends Manager {
  constructor(datas) {
    super();
    this.monsters = {};

    datas.forEach((monster) => {
      this.monsters[monster.id] = {
        mId: monster.id,
        name: monster.name,
        hp: monster.hp,
        def: monster.def,
        str: monster.str,
        int: monster.int,
        exp: monster.exp
      };
    });
  }
  mHP = null;

  getMonster(id) {
    if (!this.mHP) this.mHP = this.monsters[id].hp;
    return this.monsters[id];
  }

  getOriginalHP() {
    return this.mHP;
  }
}

class ItemManager extends Manager {
  constructor(datas) {
    super();
    this.items = {};

    datas.forEach((item) => {
      this.items[item.id] = {
        name: item.name,
        maxHP: item.maxHp,
        def: item.def,
        str: item.str,
        int: item.int
      };
    });
  }

  getItem(id) {
    return this.items[id];
  }
}
const constantManager = new ConstantManager(
  JSON.parse(fs.readFileSync(__dirname + "/constants.json"))
);

const mapManager = new MapManager(
  JSON.parse(fs.readFileSync(__dirname + "/map.json"))
);

const eventManager = new EventManager(
  JSON.parse(fs.readFileSync(__dirname + "/events.json"))
);

const monsterManager = new MonsterManager(
  JSON.parse(fs.readFileSync(__dirname + "/monsters.json"))
);

const itemManager = new ItemManager(
  JSON.parse(fs.readFileSync(__dirname + "/items.json"))
);

module.exports = {
  constantManager,
  mapManager,
  eventManager,
  monsterManager,
  itemManager
};
