const express = require("express");
const fs = require("fs");
const mongoose = require("mongoose");
const crypto = require("crypto");

const {
  constantManager,
  mapManager,
  eventManager,
  monsterManager,
  itemManager
} = require("./datas/Manager");
const { Player } = require("./models/Player");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.set("views", __dirname + "/views");
app.set("view engine", "ejs");
app.engine("html", require("ejs").renderFile);

mongoose.connect(
  "mongodb+srv://tester:Z5knBqgfuOqzb2Pu@cluster0.ye4cg.mongodb.net/Game0?retryWrites=true&w=majority",
  { useNewUrlParser: true, useUnifiedTopology: true }
);

require("./components/basic.js")();

const authentication = async (req, res, next) => {
  const { authorization } = req.headers;
  if (!authorization) return res.sendStatus(401);
  const [bearer, key] = authorization.split(" ");
  if (bearer !== "Bearer") return res.sendStatus(401);
  const player = await Player.findOne({ key });
  if (!player) return res.sendStatus(401);

  req.player = player;
  next();
};

app.get("/", (req, res) => {
  res.render("index", { gameName: constantManager.gameName });
});

app.get("/game", (req, res) => {
  res.render("game");
});

app.post("/signup", async (req, res) => {
  const { name } = req.body;

  if (await Player.exists({ name })) {
    return res.status(400).send({ error: "Player already exists" });
  }

  const player = new Player({
    name,
    maxHP: 30,
    HP: 30,
    str: 0,
    def: 0,
    int: 0,
    x: 0,
    y: 0,
    diceCount: 5
  });

  const key = crypto.randomBytes(24).toString("hex");
  player.key = key;

  await player.save();

  return res.send({ key });
});

app.get("/status_set/", (req, res) => {
  res.render("statset");
});

app.post("/throwDice", authentication, async (req, res) => {
  const { dice } = req.body;
  const player = req.player;

  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  let a = 0;
  let b = 0;
  let c = 0;
  let sum = 0;

  function throwdice() {
    do {
      a = getRandomIntInclusive(0, 10);
      b = getRandomIntInclusive(0, 10);
      c = getRandomIntInclusive(0, 10);
      sum = a + b + c;
    } while (sum !== 20);

    player["int"] = a;
    player["str"] = b;
    player["def"] = c;
    player["diceCount"] -= 1;
  }

  if (dice === "throwDice" && player["diceCount"] > 0) {
    throwdice();
    await player.save();
  } else if (dice === "throwDice" && player["diceCount"] === 0) {
    console.log("주사위를 모두 소진하였습니다.");
  }

  return res.send({ player });
});

app.post("/action", authentication, async (req, res) => {
  const { action, battleTurn, id, mHP, mId } = req.body;
  console.log();
  console.log();
  const player = req.player;
  let event = null;
  let field = null;
  let monster = null;
  let movAble = [];
  let count = req.body.count;
  console.log(req.body);
  // console.log(
  //   `action : [${action}], battleTurn : [${battleTurn}], count : [${count}]`
  // );

  field = mapManager.getField(req.player.x, req.player.y);
  event = eventHandler(field.events, player);
  if (action === "query") {
    console.log("query");
    console.log(player.x);
    count = 0;
  } else if (action === "runaway") {
    console.log("runaway");
    //준평 : 도망가기 버튼을 누르면 이쪽 블락의 코드가 실행됩니다.
    //준평 : 도망가는거 처리 코드 여기다 작성해주시면 됩니다.
  } else if (action === "move") {
    console.log("move");
    count = 0;
    const direction = parseInt(req.body.direction, 0); // 0 북. 1 동 . 2 남. 3 서.
    let x = player.x;
    let y = player.y;
    if (direction === 0) y += 1;
    else if (direction === 1) x += 1;
    else if (direction === 2) y -= 1;
    else if (direction === 3) x -= 1;
    else {
      console.log("잘못된 방향입니다! " + direction);
      res.sendStatus(400);
    }

    player.beforex = player.x;
    player.beforey = player.y;
    player.x = x;
    player.y = y;
    field = mapManager.getField(player.x, player.y); //field 업데이트
    event = eventHandler(field.events, player); //

    event.forEach(async (eve) => {
      if (eve["type"] === "battle") {
        monster = await monsterManager.getMonster(eve["id"]);
      }
    });

    await player.save();
  } else if (action === "battle" && battleTurn) {
    console.log("전투 턴입니다!1");
    if (mHP > 0) {
      monster = await battleHandler("battle", mId, player, mHP);
    } else monster = await battleHandler("battle", mId, player);
    console.log("here");
  } else if (action === "battle") {
    monster = monsterManager.getMonster(id);
    console.log("여기");
  } else if (action === "item") {
    console.log("item");
  } else {
    console.log("count is " + count + " event length is " + event.length);
  }
  movAble = makeDirection(field, req);
  console.log("최종");
  console.log(monster);
  return res.send({ player, field, event, movAble, count, monster });
});

app.post("/item", authentication, async (req, res) => {
  const { field, event, movAble, count, id } = req.body;
  let player = req.player;
  itemHandler("get", id, player);
  return res.send({ player, field, event, movAble, count });
});

app.listen(3000);
