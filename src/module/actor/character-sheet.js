/**
 * @file Extend the basic ActorSheet with some very simple modifications
 */
import OSE from "../config";
import OseCharacterCreator from "../dialog/character-creation";
import OseCharacterGpCost from "../dialog/character-gp-cost";
import OseCharacterModifiers from "../dialog/character-modifiers";
import OseActorSheet from "./actor-sheet";

export default class OseActorSheetCharacter extends OseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["themed", "theme-light", "ose", "sheet", "actor", "character"],
    position: { width: 480, height: 620 },
    actions: {
      generateScores: OseActorSheetCharacter._onGenerateScores,
      popLang: OseActorSheetCharacter._onPopLang,
      pushLang: OseActorSheetCharacter._onPushLang,
      rollExploration: OseActorSheetCharacter._onRollExploration,
      rollScore: OseActorSheetCharacter._onRollScore,
      showGpCost: OseActorSheetCharacter._onShowGpCost,
      showModifiers: OseActorSheetCharacter._onShowModifiers,
      toggleEquipped: OseActorSheetCharacter._onToggleEquipped,
    },
  };

  static TABS = {
    primary: {
      initial: "attributes",
      tabs: [
        { id: "attributes", label: "OSE.category.attributes" },
        { id: "abilities", label: "OSE.category.abilities" },
        { id: "spells", label: "OSE.category.spells" },
        { id: "inventory", label: "OSE.category.inventory" },
        { id: "notes", label: "OSE.category.notes" },
      ],
    },
  };

  static PARTS = {
    header: { template: "/templates/actors/partials/character-header.html" },
    tabnav: { template: "/templates/actors/partials/sheet-tabs.html" },
    attributes: { template: "/templates/actors/partials/character-attributes-tab.html" },
    abilities: { template: "/templates/actors/partials/character-abilities-tab.html" },
    spells: { template: "/templates/actors/partials/character-spells-tab.html", scrollable: [".inventory"] },
    inventory: { template: "/templates/actors/partials/character-inventory-tab.html", scrollable: [".inventory"] },
    notes: { template: "/templates/actors/partials/character-notes-tab.html" },
  };

  _isTabEnabled(tabId) {
    if (tabId === "notes") return true;
    if (!this.actor.isOwnerOrObserver) return false;
    if (tabId === "spells") return !!this.actor.system.spells.enabled;
    return true;
  }

  _prepareItems(data) {
    data.owned = {
      items: this.actor.system.items,
      armors: this.actor.system.armor,
      weapons: this.actor.system.weapons,
      treasures: this.actor.system.treasures,
      containers: this.actor.system.containers,
    };
    data.treasure = this.actor.system.carriedTreasure;
    data.containers = this.actor.system.containers;
    data.abilities = this.actor.system.abilities;
    data.spells = this.actor.system.spells.spellList;
    data.slots = this.actor.system.spellSlots;

    data.system.usesAscendingAC = this.actor.system.usesAscendingAC;
    data.system.meleeMod = this.actor.system.meleeMod;
    data.system.rangedMod = this.actor.system.rangedMod;
    data.system.init = this.actor.system.init;

    // biome-ignore lint/suspicious/useIterableCallbackReturn: .sort() is called for side effects on each array, return value unused
    [...Object.values(data.owned), ...Object.values(data?.spells?.spellList || {}), data.abilities].forEach((o) =>
      o.sort((a, b) => (a.sort || 0) - (b.sort || 0)),
    );
  }

  generateScores() {
    OseCharacterCreator.open(this.actor, {
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2,
      },
    });
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    this._prepareItems(context);

    const { TextEditor } = foundry.applications.ux;
    context.enrichedBiography = await TextEditor.implementation.enrichHTML(this.actor.system.details.biography);
    context.enrichedNotes = await TextEditor.implementation.enrichHTML(this.actor.system.details.notes);

    return context;
  }

  async _chooseLang() {
    const choices = CONFIG.OSE.languages;

    const templateData = { choices };
    const dlg = await foundry.applications.handlebars.renderTemplate(
      `${OSE.systemPath()}/templates/actors/dialogs/lang-create.html`,
      templateData,
    );
    return new Promise((resolve) => {
      new foundry.applications.api.DialogV2({
        window: { title: "" },
        content: dlg,
        buttons: [
          {
            action: "ok",
            label: game.i18n.localize("OSE.Ok"),
            icon: "fas fa-check",
            default: true,
            callback: (_event, button, _html) => {
              resolve(new foundry.applications.ux.FormDataExtended(button.form).object);
            },
          },
          {
            action: "cancel",
            icon: "fas fa-times",
            label: game.i18n.localize("OSE.Cancel"),
            callback: () => {},
          },
        ],
      }).render(true);
    });
  }

  _pushLang(table) {
    const data = this.actor.system;
    let update = data[table];
    this._chooseLang().then((dialogInput) => {
      const name = CONFIG.OSE.languages[dialogInput.choice];
      if (update.value) {
        update.value.push(name);
      } else {
        update = { value: [name] };
      }

      const newData = {};
      newData[table] = update;
      return this.actor.update({ system: newData });
    });
  }

  _popLang(table, lang) {
    const data = this.actor.system;
    const update = data[table].value.filter((el) => el !== lang);
    const newData = {};
    newData[table] = { value: update };
    return this.actor.update({ system: newData });
  }

  _showModifiers() {
    OseCharacterModifiers.open(this.actor, {
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2,
      },
    });
  }

  async _prepareShoppingCartData() {
    const data = await this._prepareContext({});

    const filterUnpaidItems = (items) => items.filter((item) => !item.flags?.ose?.paid);

    const cartData = { ...data };
    if (cartData.owned) {
      cartData.owned = {
        ...cartData.owned,
        items: filterUnpaidItems(cartData.owned.items || []),
        weapons: filterUnpaidItems(cartData.owned.weapons || []),
        armors: filterUnpaidItems(cartData.owned.armors || []),
        containers: filterUnpaidItems(cartData.owned.containers || []),
      };
    }

    if (cartData.items) {
      cartData.items = filterUnpaidItems(cartData.items);
    }

    return cartData;
  }

  async _showGpCost() {
    const cartData = await this._prepareShoppingCartData();
    OseCharacterGpCost.open(this.actor, cartData, {
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2,
      },
    });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollScore(event, target) {
    const { score, stat } = target.closest(".ability-score")?.dataset ?? {};
    if (score) this.actor.rollCheck(score, { event });
    else if (stat === "lr") this.actor.rollLoyalty(score, { event });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollExploration(event, target) {
    const { exploration } = target.closest("[data-exploration]")?.dataset ?? {};
    if (exploration) this.actor.rollExploration(exploration, { event });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onShowModifiers(event) {
    event.preventDefault();
    this._showModifiers();
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onShowGpCost(event) {
    event.preventDefault();
    return this._showGpCost();
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onGenerateScores() {
    this.generateScores();
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onPushLang(event, target) {
    event.preventDefault();
    this._pushLang(target.dataset.array);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onPopLang(event, target) {
    event.preventDefault();
    const { lang } = target.closest(".item")?.dataset ?? {};
    return this._popLang(target.dataset.array, lang);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static async _onToggleEquipped(_event, target) {
    const item = this._getItemFromTarget(target);
    if (!item) return;
    await item.update({ system: { equipped: !item.system.equipped } });
  }
}
