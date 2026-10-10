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

export class GearData extends foundry.abstract.DataModel {
    static defineSchema() {
    return {
        isUse: new BooleanField({required: true, initial: false}),
        dmg: new NumberField({ required: true, integer: true, min: 0, initial: 0 }),
        details: new HTMLField(),
        gearType: new StringField()
    }
  }
}

export class Gear extends HandlebarsApplicationMixin(Item) {
    /** @inheritDoc */
    static DEFAULT_OPTIONS = {
        classes: ['gear','item'],
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
        form: { template: "systems/never-going-home/items/gear/gear.hbs" },
    }
}