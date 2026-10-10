import Item from "../item.js";
const { HandlebarsApplicationMixin } = foundry.applications.api;
const {
  HTMLField,
  SchemaField,
  NumberField,
  StringField,
  ArrayField,
  BooleanField
} = foundry.data.fields;

export class SkillData extends foundry.abstract.DataModel {
    static defineSchema() {
    return {
        isKnow: new BooleanField({required: true, initial: false}),
        level: new SchemaField({
            curr: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
            max: new NumberField({ required: true, integer: true, min: 0, initial: 5 }),
        }),
        stat: new StringField(),
        short: new StringField(),
        details: new HTMLField(),
        isOpen: new BooleanField({required: true, initial: false}),
    }
  }
}

export class Skill extends HandlebarsApplicationMixin(Item) {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['skill', 'item'],
        tag: 'form',
        form: {
        handler: this.onSubmitForm,
        closeOnSubmit: false,
        submitOnChange: true
        },
        window: { resizable: true },
        actions: {
            // toggleEffect: this.#toggleEffect,
        }
    }
    
    /** @inheritDoc */
    static PARTS = {
        form: { template: "systems/never-going-home/items/skill/skill.hbs" },
    }

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        
        context.stats = {
            "brawn": game.i18n.localize(`stats.brawn.name`),
            "smarts": game.i18n.localize(`stats.smarts.name`),
            "guts": game.i18n.localize(`stats.guts.name`),
        }
        return context;
    }
}