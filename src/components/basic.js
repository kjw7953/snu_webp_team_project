const {
  constantManager,
  mapManager,
  eventManager,
  monsterManager,
  itemManager
} = require("../datas/Manager");

module.exports = function () {
  this.makeDirection = (field, req) => {
    let actions = [];
    field.canGo.forEach((direction, i) => {
      let x = req.player.x;
      let y = req.player.y;
      if (direction === true) {
        let nextX = 0;
        let nextY = 0;
        if (i === 0) nextY = 1;
        else if (i === 1) nextX = 1;
        else if (i === 2) nextY = -1;
        else nextX = -1;
        actions.push({
          url: "/action",
          text: mapManager.getField(x + nextX, y + nextY).mapName,
          //text: i,
          params: { direction: i, action: "move" }
        });
      }
    });

    return actions;
  };
  //makeDirection 함수는 이동 가능한 경로들을 만들어 줌
  //만들어준 것들은 actions에 담겨서 index.js 에서 game.ejs로 res를 통해 보내짐
  //거기에서 버튼으로 재생성

  this.eventHandler = (events, player) => {
    let returnValue = [];
    for (indvEvents of events) {
      let resultEvent = {};

      if (indvEvents.type === "event") {
        resultEvent = eventManager.getEvent(indvEvents.number);
        resultEvent["type"] = "event";
        resultEvent["percentage"] = indvEvents.percentage
        returnValue.push(resultEvent);
      } else if (indvEvents.type === "battle") {
        resultEvent["type"] = "battle";
        resultEvent["id"] = indvEvents.number;
        returnValue.push(resultEvent);
      } else if (indvEvents.type === "item") {
        resultEvent["id"] = indvEvents.number;
        let item = itemManager.getItem(indvEvents.number);
        resultEvent["type"] = "item";
        resultEvent["name"] = item.name;
        returnValue.push(resultEvent);
      }
      resultEvent["player"] = player;
    }
    return returnValue;

    // eventHandler는 해당 맵에서 일어나는 event 목록을 만들어 줌.
    // 만들어준 결과는 index.js에서 game.ejs로 res 보내줄 때 사용
  };

  this.battleHandler = async (type, mId, player, mHP) => {
    // id = monster.id, name = player.name, mHP = 이전 턴이 끝난 후 몬스터 현재 체력
    const battle = async (mId, player, mHP) => {
      let monster = monsterManager.getMonster(mId);
      if (mHP !== undefined) monster.hp = mHP;

      const sleep = (ms) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };

      const getDamage = (attacker, defenser) => {
        let diffInt = attacker.int - defenser.int;
        let attack = attacker.str;

        if (diffInt < 0 && Math.floor(Math.random() * 10) + 1 < Math.abs(diffInt)) {
          console.log("회피!");
          attack = 0;
        } else if (
          diffInt > 0 &&
          Math.floor(Math.random() * 10) + 1 < Math.abs(diffInt)
        ) {
          console.log("크리티컬!");
          attack *= 2;
        }

        const damage = defenser.def - attack;
        if (damage < -1) return Math.abs(damage);
        else return 1;
      };

      if (player.int >= monster.int) {
        console.log(`<< 몬스터의 공격 >>`);
        await sleep(500).then(() => {
          let damage = getDamage(monster, player);
          console.log(
            `${monster.name}의 공격으로 체력이 ${damage}만큼 줄었습니다.`
          );
          player.HP -= damage;
        });
        console.log();

        if (player.HP <= 0) {
          console.log("플레이어 사망");
          let x = player.x;
          let y = player.y;
          player.x = player.checkPointX;
          player.y = player.checkPointY;
          player.beforex = x;
          player.beforey = y;
          player.HP = player.maxHP;
          player.save();
          return -1;
        }

        console.log(`<< 유저의 공격 >>`);
        await sleep(500).then(() => {
          let damage = getDamage(player, monster);
          console.log(
            `당신의 공격으로 ${monster.name}의 체력이 ${damage}만큼 줄었습니다.`
          );
          monster.hp -= damage;
        });
      } else {
        console.log(`<< 유저의 공격 >>`);
        await sleep(500).then(() => {
          let damage = getDamage(player, monster);
          console.log(
            `당신의 공격으로 ${monster.name}의 체력이 ${damage}만큼 줄었습니다.`
          );
          monster.hp -= damage;
        });

        if (monster.hp > 0) {
          console.log(`<< 몬스터의 공격 >>`);
          await sleep(500).then(() => {
            let damage = getDamage(monster, player);
            console.log(
              `${monster.name}의 공격으로 체력이 ${damage}만큼 줄었습니다.`
            );
            player.HP -= damage;
          });
          console.log();

          if (player.HP <= 0) {
            console.log("플레이어 사망");
            player.x = player.checkPointX;
            player.y = player.checkPointY;
            player.HP = player.maxHP;
            return;
          }
        }
      }
      if (monster.hp <= 0) {
        console.log("몬스터 사망");
        player.exp += monster.exp;
        if (player.exp / (5 + player.level) >= 1) {
          console.log("레벨업");
          player.exp %= 5 + player.level;
          player.level++;

          let stat = Math.floor(Math.random() * 3) + 1;
          switch (stat) {
            case 1:
              player.str++;
              break;
            case 2:
              player.def++;
              break;
            case 3:
              player.int++;
              break;
            default:
              break;
          }
          player.maxHP++;
          const recovery = Math.ceil(player.maxHP * (40 / 100));
          if (player.HP + recovery >= player.maxHP) player.HP = player.maxHP;
          else player.HP += recovery;
        }
      }
      console.log(`플레이어 체력: ${player.HP}, 몬스터 체력: ${monster.hp}`);
      console.log();

      await player.save();
      console.log(monster);
      return monster;
    }
    if (type === "battle") return battle(mId, player, mHP);
  };
  
  this.itemHandler = (type, player, id) => {
    const getItem = async (player, id) => {
      // id = item.id, name = player.name

      const isHave = player.items.filter((item) => item === Number(id));

      if (isHave.length > 0) {
        console.log("이미 있어유");
        return;
      }
      const item = await itemManager.getItem(id);
      console.log(`${item.name}을 얻었다.`);
    
      Object.keys(item)
        .slice(1)
        .forEach((stat) => {
          if (item[stat] !== undefined) {
            console.log(`${stat} 올라갑니다`);
            player[stat] += item[stat];
          }
        });
    
      player.items.push(id);
      await player.save();
    };
    
  
    const loseItem = async (player) => {
      const items = player.items;
      const idx = Math.floor(Math.random() * items.length)
      console.log(itemManager.getItem(idx));
      console.log("분실");
      const resultItems = items.filter(item => item !== idx);

      player.items = resultItems;
      await player.save();
    }

    if (type === "get") getItem(player, id);
    else if (type === "lose") loseItem(player);
  }
};
