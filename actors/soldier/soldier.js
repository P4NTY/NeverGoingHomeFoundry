import {Actor, ActorData} from "../actor.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const {
  HTMLField,
  SchemaField,
  NumberField,
  ArrayField,
  BooleanField,
  ObjectField
} = foundry.data.fields;


export class SoldierData extends foundry.abstract.DataModel {
    static defineSchema() {
    return {
        ...ActorData,
        stats: new SchemaField({
            Krzepa: new SchemaField({
                curr: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
                orgin: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
            Spryt: new SchemaField({
                curr: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
                orgin: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
            Hart: new SchemaField({
                curr: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                max: new NumberField({ required: true, integer: true, min: 0, initial: 10 }),
                orgin: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
                temp: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            }),
        }),
        notes: new HTMLField(),
        story: new HTMLField(),
        isLocked: new BooleanField({required: true, initial: false}),
        ruin: new SchemaField({
            curr: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            max: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
        }),
        cards: new ArrayField(new ObjectField())
    }
  }
}

export class Soldier extends HandlebarsApplicationMixin(Actor) {    
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['soldier', 'actor'],
        tag: 'form',
        form: {
        handler: this.onSubmitForm,
        closeOnSubmit: false,
        submitOnChange: true
        },
        position: { width: 1000 },
        window: { resizable: true },
        actions: {
            rollAction: this.#rollAction,
            knowSwitch: this.#knowSwitch,
            levelSkill: {handler: this.#levelSkill, buttons: [0, 2]},
            editItem: this.#editItem,
            removeItem: this.#removeItem,
            draw: this.#draw,
            cardInit: this.#cardInit,
            cardDiscard: this.#cardDiscard,
            addSkill: this.#addSkill
        }
    }

    /** @inheritDoc */
    static PARTS = {
        form: { template: "systems/never-going-home/actors/soldier/soldier.hbs" },
    }
    
    static createSkills (actor) {
        const json = `systems/never-going-home/actors/soldier/basic_skill.json`;
        
        fetch(json).then( r => r.json() ).then( skills => {
            skills.forEach( ({ skill,stat })=>{
                Item.create({
                    "name": game.i18n.localize(`skills.${skill}.name`),
                    "type": "skill",
                    system: {
                        "short": game.i18n.localize(`skills.${skill}.short`),
                        "stat": stat,
                        "details": "",
                        "level": { curr: 0, max: 5 },
                        "isOpen": false,
                        "isBasic": true,
                        "isKnow": false
                    }
                }, { parent: actor });
            })
        } );
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        
        context.skills = this.actor.items.filter( ({type}) => type === "skill");
        if (!context.skills.length) Soldier.createSkills(this.actor);

        context.gears = this.actor.items.filter( ({type}) => type === "gear");

        return context;
    }

    static async #rollAction(event, target) {
        const skill = this.actor.items.get(target.closest('[data-item-id]').getAttribute('data-item-id'));
        await Soldier.rollDialog(
            this.actor,
            skill,
            {
                pool: this.actor.system.stats[skill.system.stat].curr + skill.system.isKnow - 1 + skill.system.level.curr + this.actor.system.stats[skill.system.stat].temp,
                cards: this.actor.system.cards
            }
        )
    }

    static async #levelSkill(event, target) {
       const mod = event.button ? -1 : 1;
       const skill = this.actor.items.get(target.closest('[data-item-id]').getAttribute('data-item-id'));

        skill.update({
            "system.level.curr": Math.max(0, Math.min(skill.system.level.curr + mod,  skill.system.level.max))
        })
    }

    static async #knowSwitch(event, target) {
        const skill = this.actor.items.get(target.closest('[data-item-id]').getAttribute('data-item-id'));
        skill.update({
            "system.isKnow": !skill.system.isKnow
        })
    }

    static async #removeItem(event, target) {
        Soldier.itemDel(
            target.closest("[data-item-id]").getAttribute("data-item-id"),
            this.actor
        )
    }

    static async #editItem(event, target) {
        this.actor.items.get(target.closest('[data-item-id]').getAttribute('data-item-id')).sheet.render(true)
    }

    static async #draw(event, target) {
        Soldier.draw(this.actor)
    }

    static async #cardAction (event, target) {
        const card_data = this.actor.system.cards.filter( ({id}) => id == target.closest('[data-id]').getAttribute('data-id') )[0]
        const card = game.cards.get(
          card_data.deck_id
        ).cards.get( card_data.id );
        
        ChatMessage.create({ 
            content: await foundry.applications.handlebars.renderTemplate('systems/never-going-home/actors/soldier/parts/card.hbs', card_data),
            whisper: game.users.filter(u => u.isGM).map(u => u.id) 
        });
    }

    static async #cardInit (event, target) {
        const card_data = this.actor.system.cards.filter( ({id}) => id == target.closest('[data-id]').getAttribute('data-id') )[0];
        
        ChatMessage.create({ 
            content: await foundry.applications.handlebars.renderTemplate('systems/never-going-home/actors/soldier/parts/card.hbs', card_data),
            whisper: game.users.filter(u => u.isGM).map(u => u.id) 
        });
    }
    
    static async #cardDiscard (event, target) {
        Soldier.discard(this.actor, target)
    }

    static async #addSkill (event, target) {
        const item = await Item.create({
            name: "Nowe Wyszkolenie",
            type: "skill"
        }, { parent: this.actor });

        item.sheet.render(true);
    }
}