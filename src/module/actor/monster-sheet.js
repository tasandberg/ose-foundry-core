/**
 * @file The sheet class for Actors of type Monster
 */
import OSE from "../config";
import OseActorSheet from "./actor-sheet";

export default class OseActorSheetMonster extends OseActorSheet {
  static DEFAULT_OPTIONS = {
    classes: ["ose", "sheet", "monster", "actor"],
    position: { width: 450, height: 560 },
    actions: {
      cyclePattern: OseActorSheetMonster._onCyclePattern,
      generateSaves: OseActorSheetMonster._onGenerateSaves,
      resetAttacks: OseActorSheetMonster._onResetAttacks,
      rollAppearing: OseActorSheetMonster._onRollAppearing,
      rollHP: OseActorSheetMonster._onRollHP,
      rollMorale: OseActorSheetMonster._onRollMorale,
      rollReaction: OseActorSheetMonster._onRollReaction,
    },
  };

  static TABS = {
    primary: {
      initial: "attributes",
      tabs: [
        { id: "attributes", label: "OSE.category.attributes" },
        { id: "inventory", label: "OSE.category.inventory" },
        { id: "spells", label: "OSE.category.spells" },
        { id: "notes", label: "OSE.category.notes" },
      ],
    },
  };

  static PARTS = {
    header: { template: "/templates/actors/partials/monster-header.html" },
    tabnav: { template: "/templates/actors/partials/sheet-tabs.html" },
    attributes: { template: "/templates/actors/partials/monster-attributes-tab.html" },
    inventory: { template: "/templates/actors/partials/character-inventory-tab.html", scrollable: [".inventory"] },
    spells: { template: "/templates/actors/partials/character-spells-tab.html", scrollable: [".inventory"] },
    notes: { template: "/templates/actors/partials/monster-notes-tab.html" },
  };

  _isTabEnabled(tabId) {
    if (tabId === "notes") return true;
    if (!this.actor.isOwnerOrObserver) return false;
    if (tabId === "inventory") return !!this.actor.system.config.enableInventory;
    if (tabId === "spells") return !!this.actor.system.spells.enabled;
    return true;
  }

  _prepareItems(data) {
    data.owned = {
      weapons: this.actor.system.weapons,
      items: this.actor.system.items,
      containers: this.actor.system.containers,
      armors: this.actor.system.armor,
      treasures: this.actor.system.treasures,
    };

    data.attackPatterns = this.actor.system.attackPatterns;
    data.spells = this.actor.system.spells.spellList;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    this._prepareItems(context);

    const { TextEditor } = foundry.applications.ux;
    context.config.morale = game.settings.get(game.system.id, "morale");
    context.system.details.treasure.link = await TextEditor.implementation.enrichHTML(
      context.system.details.treasure.table,
    );
    context.enrichedBiography = await TextEditor.implementation.enrichHTML(this.actor.system.details.biography);

    context.encumbranceTemplate = "";

    return context;
  }

  async generateSave() {
    const choices = CONFIG.OSE.monster_saves;

    const templateData = { choices };
    const dlg = await foundry.applications.handlebars.renderTemplate(
      `${OSE.systemPath()}/templates/actors/dialogs/monster-saves.html`,
      templateData,
    );
    return new foundry.applications.api.DialogV2({
      window: { title: game.i18n.localize("OSE.dialog.generateSaves") },
      position: {
        width: 250,
      },
      content: dlg,
      buttons: [
        {
          action: "ok",
          label: game.i18n.localize("OSE.Ok"),
          icon: "fas fa-check",
          default: true,
          callback: (_event, button) => {
            const { hd } = new foundry.applications.ux.FormDataExtended(button.form).object;
            this.actor.generateSave(hd.replace(/[^\d+.-]/g, ""));
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
  }

  async _onDropDocument(event, document) {
    if (document?.documentName !== "RollTable") return super._onDropDocument(event, document);

    const link = document.pack ? `@UUID[${document.uuid}]{${document.name}}` : `@UUID[${document.uuid}]`;
    await this.actor.update({ "system.details.treasure.table": link });
    return document;
  }

  async _resetAttacks() {
    return Promise.all(
      this.actor.items
        .filter((i) => i.type === "weapon")
        .map((weapon) =>
          weapon.update({
            "system.counter.value": Number.parseInt(weapon.system.counter.max, 10),
          }),
        ),
    );
  }

  async _updateAttackCounter(event) {
    event.preventDefault();
    const item = this._getItemFromTarget(event.target);
    if (!item) return;

    if (event.target.dataset.field === "value") {
      return item.update({
        "system.counter.value": Number.parseInt(event.target.value, 10),
      });
    }
    if (event.target.dataset.field === "max") {
      return item.update({
        "system.counter.max": Number.parseInt(event.target.value, 10),
      });
    }
  }

  _cycleAttackPatterns(target) {
    const item = this._getItemFromTarget(target);
    if (!item) return;
    const currentColor = item.system.pattern;
    const colors = Object.keys(CONFIG.OSE.colors);
    colors.push("transparent");
    let index = colors.indexOf(currentColor);
    if (index + 1 === colors.length) {
      index = 0;
    } else {
      index++;
    }
    item.update({
      "system.pattern": colors[index],
    });
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    for (const input of this.element.querySelectorAll(".counter input")) {
      input.addEventListener("click", (event) => event.currentTarget.select());
      input.addEventListener("change", this._updateAttackCounter.bind(this));
    }

    for (const link of this.element.querySelectorAll(".treasure-table a")) {
      link.addEventListener("contextmenu", () => {
        this.actor.update({ "system.details.treasure.table": null });
      });
    }
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollMorale(event) {
    this.actor.rollMorale({ event });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollReaction(event) {
    this.actor.rollReaction({ event });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollAppearing(event, target) {
    const { check } = target.closest(".check-field")?.dataset ?? {};
    this.actor.rollAppearing({ event, check });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollHP(event) {
    this.actor.rollHP({ event });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onResetAttacks() {
    return this._resetAttacks();
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onCyclePattern(_event, target) {
    this._cycleAttackPatterns(target);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onGenerateSaves() {
    return this.generateSave();
  }
}
