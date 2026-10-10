import {Actor, ActorData} from "../actor.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const {
  HTMLField,
  SchemaField,
  NumberField,
  ArrayField,
  BooleanField,
  ObjectField,
  StringField
} = foundry.data.fields;


export class NpcData extends foundry.abstract.DataModel {
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
        weaks: new HTMLField(),
        armor: new StringField(),
        isLocked: new BooleanField({required: true, initial: false}),
        reward: new StringField(),
        cards: new ArrayField(new ObjectField()),
        story: new HTMLField(),
        initiative: new StringField(),
    }
  }
}

export class Npc extends HandlebarsApplicationMixin(Actor) {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['Npc', 'actor'],
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
            addSkill: this.#addSkill,
            addGear: this.#addGear
        }
    }

    /** @inheritDoc */
    static PARTS = {
        form: { template: "systems/never-going-home/actors/Npc/Npc.hbs" },
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        
        context.skills = this.actor.items.filter( ({type}) => type === "skill");
        context.gears = this.actor.items.filter( ({type}) => type === "gear");

        return context;
    }

    static async #rollAction(event, target) {
        const skill = this.actor.items.get(target.closest('[data-item-id]').getAttribute('data-item-id'));
        await Npc.rollDialog(
            this.actor,
            skill,
            {
                pool: this.actor.system.stats[skill.system.stat].curr + skill.system.isKnow - 1 + skill.system.level.curr,
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
        Npc.itemDel(
            target.closest("[data-item-id]").getAttribute("data-item-id"),
            this.actor
        )
    }

    static async #editItem(event, target) {
        this.actor.items.get(target.closest('[data-item-id]').getAttribute('data-item-id')).sheet.render(true)
    }

    static async #draw(event, target) {
        Npc.draw(this.actor)
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
        Npc.discard(this.actor, target)
    }

    static async #addSkill (event, target) {
        const item = await Item.create({
            name: "Nowa Umiejętność",
            type: "skill"
        }, { parent: this.actor });

        item.sheet.render(true);
    }
    
    static async #addGear (event, target) {
        const item = await Item.create({
            name: "Nowy Sprzęt",
            type: "gear"
        }, { parent: this.actor });

        item.sheet.render(true);
    }
}