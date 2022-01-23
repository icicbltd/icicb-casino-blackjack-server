const axios = require("axios");
const { vary } = require("express/lib/response");
const rand = require("random-seed").create();
require("dotenv").config();

// Users List
const usersPoints = {};

const Cardstring = ["spade", "heart", "club", "diamond"];
const Cardsname = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "A", "J", "Q", "K"];

var AllCard = [];
var CardWeights = [];

const Carddeploy = () => {
    for (var i = 0; i < 4; i++) {
        for (var j = 0; j < 13; j++) {
            AllCard[i * 13 + j] = Cardstring[i] + Cardsname[j];
            if (j > 9) {
                CardWeights[i * 13 + j] = 10;
            } else {
                CardWeights[i * 13 + j] = j + 2;
            }
        }
    }
}

const CardRandom = (user) => {
    user.RandomCardNames = [];
    for (var i = 0; i < 52;) {
        var RandomNum = rand.intBetween(0, 51);
        if (user.RandomCardNames.indexOf(AllCard[RandomNum]) != -1) {
            continue;
        }
        user.RandomCardNames[i] = AllCard[RandomNum];
        user.RandomCardWeights[i] = CardWeights[RandomNum];
        i++;
    }
}

const BlackJack = (e) => {
    e.H_weight = 0;
    e.C_weight = 0;
    for (var i = 0; i < e.HumanWeight.length; i++) {
        e.H_weight += e.HumanWeight[i];
    }
    for (var i = 0; i < e.ComputerWeight.length; i++) {
        e.C_weight += e.ComputerWeight[i];
    }
    if (e.C_weight > 17) {
        e.ComputerStand = false;
        if (e.C_weight > 21) {
            if (e.ComputerWeight.indexOf(11) != -1) {
                e.ComputerWeight[e.ComputerWeight.indexOf(11)] = 1;
                e.C_weight -= 10;
                if (e.C_weight < 18) {
                    e.ComputerStand = true;
                }
            }
        }
    }
    if (e.H_weight > 21) {
        if (e.HumanWeight.indexOf(11) != -1) {
            e.HumanWeight[e.HumanWeight.indexOf(11)] = 1;
            e.H_weight -= 10;
        }
    }
    if (e.H_weight == 21) {
        e.myStates = "Win";
    }
    if (e.H_weight == 21 && e.C_weight == 21) {
        e.myStates = "Tie";
    } else if (e.H_weight == 21 && e.C_weight != 21) {
        e.myStates = "Win";
    } else if (e.H_weight != 21 && e.C_weight == 21) {
        e.myStates = "Lose";
    } else if (e.H_weight > 21) {
        e.myStates = "Lose";
    } else if (e.C_weight > 21) {
        e.myStates = "Win";
    } else if (!e.HumanStand && !e.ComputerStand) {
        if (e.H_weight > e.C_weight) {
            e.myStates = "Win";
        } else if (e.H_weight < e.C_weight) {
            e.myStates = "Lose";
        } else if (e.H_weight == e.C_weight) {
            e.myStates = "Tie";
        }
    } else {
        e.myStates = "Nothing";
    }
}

const HumenValue = async (e) => {
    var HumanAnotherNum;
    e.HumanRandomCards = [];
    e.ComputerRandomCards = [];
    if (e.HumanStand) {
        e.HumanWeight[e.HumanWeight.length] = e.RandomCardWeights[e.count];
        e.HumanRandomCards[0] = e.RandomCardNames[e.count];
        HumanAnotherNum = e.H_weight + e.RandomCardWeights[e.count];
        e.count++;
    }
    if (e.ComputerStand && !e.HumanStand) {
        var newcount = 0;
        while (e.ComputerStand) {
            e.ComputerWeight[e.ComputerWeight.length] = e.RandomCardWeights[e.count];
            e.ComputerRandomCards[newcount] = e.RandomCardNames[e.count];
            newcount++;
            e.count++;
            e.C_weight += e.ComputerWeight[e.ComputerWeight.length - 1];
            if (e.C_weight >= 17) {
                e.ComputerStand = false;
                if (e.C_weight > 21) {
                    if (e.ComputerWeight.indexOf(11) != -1) {
                        e.ComputerWeight[e.ComputerWeight.indexOf(11)] = 1;
                        e.C_weight -= 10;
                        if (e.C_weight < 18) {
                            e.ComputerStand = true;
                        }
                    }
                }
            }
        }
    } else if (e.ComputerStand && e.HumanStand) {
        if (e.C_weight < 17 && HumanAnotherNum < 21) {
            e.ComputerWeight[e.ComputerWeight.length] = e.RandomCardWeights[e.count];
            e.ComputerRandomCards[0] = e.RandomCardNames[e.count];
            e.count++;
        }
    }
    await BlackJack(e);
}

const WaitPlatForm = async (e) => {
    try {
        if (e.myStates == "Win") {
            await axios.post(
                process.env.PLATFORM_SERVER + "api/games/winlose",
                {
                    token: e.sendToken,
                    amount: e.betBalance * 2,
                    winState: true,
                }
            );
        } else if (e.myStates == "Tie") {
            await axios.post(
                process.env.PLATFORM_SERVER + "api/games/winlose",
                {
                    token: e.sendToken,
                    amount: e.betBalance,
                    winState: true,
                }
            );
        } else {
            return;
        }
    } catch {
        throw new Error("Server Error");
    }
}

module.exports = {
    StartSignal: async (req, res) => {
        try {
            const { token, betValue } = req.body;
            // try {
            //     await axios.post(
            //         process.env.PLATFORM_SERVER + "api/games/bet",
            //         {
            //             token: token,
            //             amount: betValue,
            //         }
            //     );
            // } catch {
            //     throw new Error("Bet Error");
            // }
            let user = usersPoints[token];
            if (user === undefined) {
                usersPoints[token] = {
                    betBalance: 0,
                    RandomCardNames: [],
                    HumanRandomCards: [],
                    ComputerRandomCards: [],
                    H_weight: 0,
                    C_weight: 0,
                    HumanWeight: [],
                    ComputerWeight: [],
                    myStates: "",
                    RandomCardWeights: [],
                    ComputerStand: true,
                    HumanStand: true,
                    sendToken: "",
                    count: 0
                }
                user = usersPoints[token];
            }
            user.HumanStand = true;
            user.ComputerStand = true;
            user.count = 0;
            user.HumanWeight = [];
            user.ComputerWeight = [];
            user.betBalance = betValue;
            user.sendToken = token;
            await Carddeploy();
            await CardRandom(user);
            for (var i = 0; i < 2; i++) {
                user.HumanRandomCards[i] = user.RandomCardNames[user.count];
                user.HumanWeight[i] = user.RandomCardWeights[user.count];
                user.count++;
            }
            for (var i = 0; i < 2; i++) {
                user.ComputerRandomCards[i] = user.RandomCardNames[user.count];
                user.ComputerWeight[i] = user.RandomCardWeights[user.count];
                user.count++;
            }
            await BlackJack(user);
            // await WaitPlatForm(user);
            res.json({
                Message: "Success",
                MyState: user.myStates,
                Human: user.HumanRandomCards,
                Computer: user.ComputerRandomCards
            })
        } catch (err) {
            res.json({
                Message: err.message,
                MyState: "",
                Human: [],
                Computer: []
            });
        }
    },
    HitAndStand: async (req, res) => {
        try {
            const { state, token } = req.body;
            let user = usersPoints[token];
            if (state == "Stand") {
                user.HumanStand = false;
            }
            await HumenValue(user);
            // await WaitPlatForm(user);
            res.json({
                Message: "Success",
                MyState: user.myStates,
                Human: user.HumanRandomCards,
                Computer: user.ComputerRandomCards
            })
        } catch (err) {
            res.json({
                Message: err.message,
                MyState: "",
                Human: [],
                Computer: []
            })
        }
    }
};
