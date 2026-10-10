import { Soldier, SoldierData } from "./actors/soldier/soldier.js";
import { Npc, NpcData } from "./actors/npc/npc.js";
import { Skill, SkillData } from "./items/skill/skill.js";
import { Gear, GearData } from "./items/gear/gear.js";
import { Actor } from "./actors/actor.js";

async function preloadHandlebarTemplates() {
    const path = "systems/never-going-home/"

    const templatepaths = [
        `${path}actors/soldier/parts/skill.hbs`,
        `${path}actors/soldier/parts/gear.hbs`,
        `${path}actors/soldier/parts/card.hbs`,
    ];
    return loadTemplates(templatepaths);
}

Hooks.once("init", async function () {
    console.log('Start');

    Object.assign(CONFIG.Actor.dataModels, {
        soldier: SoldierData,
        npc: NpcData
    })
    Actors.registerSheet("ngh", Soldier, {types: ["soldier"], makeDefault: true});
    Actors.registerSheet("ngh", Npc, {types: ["npc"], makeDefault: true});

    Object.assign(CONFIG.Item.dataModels, {
        skill: SkillData,
        gear: GearData
    })
    Items.registerSheet("ngh", Skill, {types: ["skill"], makeDefault: true});
    Items.registerSheet("ngh", Gear, {types: ["gear"], makeDefault: true});

    await preloadHandlebarTemplates();

    console.log("Successfully initialized NGH!");
});

Hooks.once("ready", async function() {  
        if (!game.cards.getName("Deck")) {
        const deck = await Cards.create({  
        name: "Deck",  
        type: "deck",  
        description: "Talia kart używana do gry."  
        });  

        const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];  
        const cardData = [];  
        for (const suit of suits) {  
            for (let value = 1; value <= 13; value++) { 
                const nWord = ['Jack', 'Queen', 'King'][value-11];
                cardData.push({  
                    name: `${value} of ${suit}`,
                    suit: suit.toLowerCase(),
                    value: value,
                    faces: [{ name: `${nWord||value} of ${suit}`, img: "", text: "" }],  
                    back: { name: "Card Back", img: "", text: "" }  
                });  
            }  
        }
         cardData.push({  
            name: `Black Joker`,
            suit: 'spades',
            value: 14,
            faces: [{ name: `Black Joker`, img: "", text: "" }],  
            back: { name: "Card Back", img: "", text: "" }  
        });
        cardData.push({  
            name: `Red Joker`,
            suit: 'hearts',
            value: 14,
            faces: [{ name: `Red Joker`, img: "", text: "" }],  
            back: { name: "Card Back", img: "", text: "" }  
        });  

        await deck.createEmbeddedDocuments("Card", cardData);
        game.cards.getName('Deck').shuffle()
    }

    if (!game.cards.getName("Grave")) {
        await Cards.create({  
            name: "Grave",  
            type: "deck",  
            description: "Stos kart odrzuconych"  
        });  
    }
})

Hooks.on("renderChatMessage", (app, html, data) => {
  html.find('button[data-action="modRoll"]').on("click", async (event) => {
    event.preventDefault();
    const msg = game.messages.get(event.target.closest('[data-message-id]').getAttribute('data-message-id'))
    const isValid = [
        game.user.isGM,
        msg.author.id === game.user.id
    ].filter( x => x).length > 0
    
    if ( !isValid ) return;
    const actor = game.actors.get(game.messages.get(event.target.closest('[data-message-id]').getAttribute('data-message-id')).speaker.actor);

    Actor.reRollDialog(
        event.target,
        actor,
        event.target.getAttribute('data-skill'),
        {
            pool: event.target.getAttribute('data-pool'),
            cards: actor.system.cards,
            diceArr: event.target.getAttribute('data-dicearray').split(',').map( x => ({
                value: x,
                cost: 5-x,
                icon: ['one','two', 'three', 'four', 'five', 'six'][x-1],
                rra: event.target.closest('[data-rra]').getAttribute('data-rra')            
            })),
        }
    )
  });
});

Hooks.on("dropActorSheetData", (actor, sheet, data) => {
    console.log({
        actor: actor,
        data: data,
        sheet: sheet
    });

    if (
        (data.type !== "Card")
        ||
        (!['soldier','npc'].includes(actor.type))
    ) return ;

    const [x,deck,y, card] = data.uuid.split('.');

    if (!deck || !card) return ;
    
    actor.update({
        "system.cards":
        [...actor.system.cards, {
            deck_id: deck,
            id: card,
            suit: game.cards.get( deck ).cards.get( card ).suit,
            value: game.cards.get( deck ).cards.get( card ).value
        }]
    })

    game.cards.get( deck ).cards.get( card ).update({
        drawn: true
    })
});

// Custom HandelBars
Handlebars.registerHelper("for", function(n, content) {
    let result = ``;
    for (let i = 1 ; i <= n ; i++)
        result += content.fn(this).replace('#{i}', i);
    return result;
});

Handlebars.registerHelper('isBigger', function (max, value) {
    return value <= max;
});

Handlebars.registerHelper('isLower', function (min, value) {
    return value > min;
});

Handlebars.registerHelper('isEqual', function (max, value) {
    return value == max;
});

Handlebars.registerHelper('isNotEqual', function (max, value) {
    return value != max;
});


Handlebars.registerHelper( 'loop', function (n, content) {
    let result = "";
    for (let i = 0 ; i < n ; ++i) {
        result += content.fn(i);
    }
    return result;
})

Handlebars.registerHelper( 'loopTrack', function (min, max, current, track, sort) {
    let result = ``;
    switch (sort) {
        case 'asc':
            for ( let i = max ; i >= min ; i-- )
                result += `<label><input name="${track}" type="radio" value=${i} ${i == current ? 'checked' : ''}/>${i}</label>`;
            break;
        case 'desc':
            for ( let i = min ; i <= max ; i++ )
                result += `<label><input name="${track}" type="radio" value=${i} ${i == current ? 'checked' : ''}/>${i}</label>`;
            break;
        default:
            console.warn(`Don't set sort flag`)
            break;
    }
    return result
})