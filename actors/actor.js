const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheet } = foundry.applications.sheets;
const {
  NumberField,
  StringField,
  ArrayField
} = foundry.data.fields;

export class ActorData extends foundry.abstract.DataModel {
  static defineSchema() {
    return {
      pool: new NumberField({integer: true, min: 0, initial: 0 }),
      cards: new ArrayField(new StringField()),
      diceArr: new ArrayField(new NumberField()),
      boostArr: new ArrayField(new NumberField())
    }
  }
}

export class Actor extends HandlebarsApplicationMixin(ActorSheet) {
  get document() { return this.options.document }
  get title() { return `${this.document.name}` }

  async _prepareContext(options) {
    const context = await super._prepareContext(options)
    context.actor = this.actor;
    context.system = this.actor.system;
    
    return context
  }

  static async onSubmitForm(event, form, formData) {
    event.preventDefault()
    await this.document.update(formData.object)
  }

  static getTemplateData (action, approach, actor) {
    return ({
      actorType: actor.type,
      img: actor.img,
      name: actor.name,
      title: "",
      class: "",
      dices: "",
      desc: "",
      action: action,
      approach: approach
    })
  }

  static dicesToIcon (diceArray) {
    const sides = ['one','two', 'three', 'four', 'five', 'six'];
    return diceArray.map( (dice, index) => `<i class="fa-solid fa-dice-${sides[dice-1]}"></i>` ).join('')
  }

  static async rollPop (templateData, letsRoll, diceArray = []) {
    templateData.diceArray = diceArray.toString();
    templateData.diceIcons = Actor.dicesToIcon(diceArray);
    templateData.success = diceArray.filter( x => x >= 5).length;
    const content = await foundry.applications.handlebars.renderTemplate('systems/never-going-home/parts/rollMsg.hbs', templateData);

    const msgData = {
      user: game.user._id,
      speaker: ChatMessage.getSpeaker({actor: game.actors.getName(templateData.name)}),
      content: content
    }

    if (letsRoll) msgData.rolls = [letsRoll];

    ChatMessage.create(
      ChatMessage.applyMode(
        msgData,
        game.settings.get("core", "messageMode")
      )
    );
  }

  static async rollDialog (actor, skill, dialogOptions) {
    new foundry.applications.api.DialogV2({
      window: { title: "Rzuć: " + skill.name },
      content: await foundry.applications.handlebars.renderTemplate('systems/never-going-home/parts/rollDialog.hbs', dialogOptions),
      buttons: [
        {
          action: "roll",
          label: "Rzuć: 0",
          default: true,
          callback: async (event, button, dialog) => {
            const cardsDrop = [...button.form.card||[]].filter( x => x.checked);
            const [letsRoll, diceArr] = await Actor.roll(parseInt(button.form.diceArr.value) + cardsDrop.length);
            await Actor.rollPop({
              name: actor.name,
              skill: skill.name,
              pool: dialogOptions.pool - button.form.diceArr.value,
              cards: cardsDrop,
              rra: "yes"
            }, letsRoll, diceArr);

            actor.update({
              "system.cards": actor.system.cards.filter( ({id}) => !cardsDrop.map( ({value}) => value ).includes(id) )
            })
          }
        }
      ],
      actions: {
        checkDicePool: function (event, target) {
          const btn = document.querySelector('[data-action="roll"]');
          const dices = parseInt(document.querySelectorAll('[name="diceArr"]:checked')[0].value) + document.querySelectorAll('[name="card"]:checked').length;

          btn.innerText = btn.innerText.split(': ')[0] + ': ' + dices
        }
      },
      submit: result => {}
    }).render({ force: true });
  }

  static async reRollDialog (btn, actor, skill, dialogOptions) {
    new foundry.applications.api.DialogV2({
      window: { title: "Zmodyfikuj: " + skill },
      content: await foundry.applications.handlebars.renderTemplate('systems/never-going-home/parts/reRollDialog.hbs', dialogOptions),
      buttons: [
        {
          action: "comfirm",
          label: "Zatwierdź",
          default: true,
          callback: async (event, button, dialog) => {
            let cost = 0;
            const reRollArr = [...dialog.element.querySelectorAll('[name="reRoll_"]:checked')].map( input => input.closest('[data-value]').getAttribute('data-value'));
            if ( reRollArr.length ) cost = 1;
            const upArr = [...dialog.element.querySelectorAll('[name="upgrade_"]:checked')].map( input => {
              cost += parseInt(input.closest('[data-cost]').getAttribute('data-cost'));
              return input.closest('[data-value]').getAttribute('data-value')
            });
            const [letsRoll, diceArr] = await Actor.roll(reRollArr.length);
            // remove olds
            let resultArr = dialogOptions.diceArr.map( ({value}) => value ).join('');
            reRollArr.forEach( dice => { resultArr = resultArr.replace(dice,'') });
            // replace Up
            upArr.forEach( dice => { resultArr = resultArr.replace(dice, '5')  });

            resultArr = resultArr.split('').concat(diceArr).filter( x => x);
            btn.outerHTML = '<h3>Zedytowano</h3>';

            await Actor.rollPop({
              name: actor.name,
              pool: dialogOptions.pool - cost,
              skill: skill,
              rra: !reRollArr.length ? "yes" : "no"
            }, letsRoll, resultArr)
          }
        }
      ],
      submit: result => {},
      actions: {
        checkCost: function (event, target) {
          const span = document.getElementById('pool');
          const isReRollActive = document.querySelector('[name="reRoll_"]:checked') ? 1 : 0;
          const upCost = [...document.querySelectorAll('[data-cost]:has(:checked)')].map( label => label.getAttribute('data-cost') ).reduce( (agg,val) => agg + parseInt(val), 0 );
          const cardsDrop = [...document.querySelectorAll('[name="card"]:checked')].map( ({value}) => value )
          const selectCost = parseInt(dialogOptions.pool) + cardsDrop.length - isReRollActive - upCost;
          span.innerText = selectCost;
          this.element.querySelector('[type="submit"]').disabled = !(selectCost >= 0)
        }
      }
    }).render({ force: true });
  }

  static async roll (dices) {
    if (dices === 0) return [ 0, [] ];

    const letsRoll = await new Roll(`${dices}d6`).roll({});
    
    return [
      letsRoll,
      letsRoll.terms[0].results.map( ({result}) => result)
    ];
  }

  static async itemAdd (data, actor) {
    Item.create(data, { parent: actor })
  }
  static async itemDel (id, actor) {
    actor.deleteEmbeddedDocuments("Item", [id])
  }

  static async draw (actor) {
    const deck = game.cards.getName('Deck');
    const grave = game.cards.getName('Grave');
    if (!deck) return console.warn('Brak Talii');
    const card = [...deck.cards].sort( (a,b) => a.sort - b.sort ).filter( ({drawn}) => !drawn)[0];

    if (!card) {
      [...grave.cards].map( grave_card => {
        deck.cards.get(grave_card._id).update({"drawn":false});
        grave_card.delete();
      })
    }

    actor.update({
      "system.cards": [
        ...actor.system.cards,
        {
          deck_id: deck._id,
          id: card._id,
          value: card.value,
          suit: card.suit
        }
      ]
    });
    card.update({ "drawn": !card.drawn })
  }

  static async discard (actor, target) {
    const card_data = actor.system.cards.filter( ({id}) => id == target.closest('[data-id]').getAttribute('data-id') )[0];
    const grave = game.cards.getName('Grave');
    const card = game.cards.get(card_data.deck_id).cards.get( card_data.id );
    
    ChatMessage.create({ 
      content: await foundry.applications.handlebars.renderTemplate('systems/never-going-home/actors/soldier/parts/card.hbs', card_data),
      whisper: game.users.filter(u => u.isGM).map(u => u.id) 
    });

    actor.update({
      "system.cards": [...actor.system.cards.filter( ({id}) => id !== card_data.id )]
    })
    card.update({ drawn: false }).then( ()=> {
      card.pass(grave);
    }).then( ()=> { card.update({ drawn: true }) })
  }
}