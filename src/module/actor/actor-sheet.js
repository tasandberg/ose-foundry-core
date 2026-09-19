/**
 * @file The base class we use for Character and Monster sheets. Shared behavior goes here!
 */
import OSE from "../config";
import OseEntityTweaks from "../dialog/entity-tweaks";
import skipRollDialogCheck from "../helpers-behaviour";
import bindItemContextMenu from "../sheet/context-menu";
import { buildTabsContext } from "../sheet/tab-helpers";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class OseActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  _expanded = new Set();

  #collapsedCategories = new Set();

  #collapsedContainers = new Set();

  static DEFAULT_OPTIONS = {
    classes: ["themed", "theme-light", "ose", "sheet", "actor"],
    tag: "form",
    form: { submitOnChange: true, closeOnSubmit: false },
    window: { resizable: true },
    actions: {
      configureActor: OseActorSheet._onConfigureActor,
      consumeUse: OseActorSheet._onConsumeUse,
      createItem: OseActorSheet._onCreateItem,
      deleteItem: OseActorSheet._onDeleteItem,
      editItem: OseActorSheet._onEditItem,
      resetSpells: OseActorSheet._onResetSpells,
      restoreUse: OseActorSheet._onRestoreUse,
      rollAttack: OseActorSheet._onRollAttack,
      rollHitDice: OseActorSheet._onRollHitDice,
      rollItem: OseActorSheet._onRollItem,
      rollSave: OseActorSheet._onRollSave,
      showItem: OseActorSheet._onShowItem,
      toggleCategory: OseActorSheet._onToggleCategory,
      toggleContainedItems: OseActorSheet._onToggleContainedItems,
      toggleItemSummary: OseActorSheet._onToggleItemSummary,
    },
  };

  _isTabEnabled(_tabId) {
    return true;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    const tabIds = new Set((this.constructor.TABS?.primary?.tabs ?? []).map(({ id }) => id));

    for (const [partId, part] of Object.entries(parts)) {
      if (part.template?.startsWith("/")) part.template = `${OSE.systemPath()}${part.template}`;
      if (tabIds.has(partId) && !this._isTabEnabled(partId)) delete parts[partId];
    }

    if (!this._isTabEnabled(this.tabGroups.primary)) this.tabGroups.primary = "notes";
    return parts;
  }

  async _preparePartContext(partId, context, options) {
    const partContext = await super._preparePartContext(partId, context, options);
    partContext.tab = partContext.tabs?.primary?.[partId];
    return partContext;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const { actor } = this;

    for (const item of actor.items) {
      item.isExpanded = this._expanded.has(item.id);
      await item.prepareDerivedData();
    }

    return Object.assign(context, actor.toObject(false), {
      cssClass: this.isEditable ? "editable" : "locked",
      owner: actor.isOwner,
      editable: this.isEditable,
      isOwnerOrObserver: actor.isOwnerOrObserver,
      isNew: actor.isNew(),
      config: {
        ...CONFIG.OSE,
        ascendingAC: game.settings.get(game.system.id, "ascendingAC"),
        initiative: game.settings.get(game.system.id, "initiative") !== "group",
        encumbrance: game.settings.get(game.system.id, "encumbranceOption"),
        encumbranceStrengthMod:
          game.settings.get(game.system.id, "encumbranceItemStrengthMod") &&
          game.settings.get(game.system.id, "encumbranceOption") === "itembased",
      },
      encumbranceTemplate:
        OSE.encumbrance?.templateEncumbranceBar ||
        `${OSE.systemPath()}/templates/actors/partials/character-encumbrance.html`,
      tabs: buildTabsContext(this, (tab) => this._isTabEnabled(tab.id)),
    });
  }

  _getHeaderControls() {
    const controls = super._getHeaderControls();
    if (this.isEditable && (game.user.isGM || this.actor.isOwner)) {
      controls.unshift({
        action: "configureActor",
        icon: "fas fa-code",
        label: "OSE.dialog.tweaks",
      });
    }
    return controls;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);

    if (options.isFirstRender) bindItemContextMenu(this);
    this._restoreCollapsedState();
    this._applyResizableSizes();

    for (const input of this.element.querySelectorAll(".item-category-title input")) {
      input.addEventListener("click", (event) => event.stopPropagation());
    }
    for (const input of this.element.querySelectorAll(".quantity input")) {
      input.addEventListener("click", (event) => event.currentTarget.select());
      input.addEventListener("change", this._updateItemQuantity.bind(this));
    }
    for (const input of this.element.querySelectorAll(".memorize input")) {
      input.addEventListener("click", (event) => event.currentTarget.select());
      input.addEventListener("change", this._onSpellChange.bind(this));
    }
  }

  _onPosition(position) {
    super._onPosition(position);
    this._applyResizableSizes();
  }

  _applyResizableSizes() {
    const baseHeight = this.options.position?.height;
    if (!this.element || typeof baseHeight !== "number" || typeof this.position.height !== "number") return;
    const heightDelta = this.position.height - baseHeight;

    for (const el of this.element.querySelectorAll(".resizable[data-base-size]")) {
      const baseSize = Number.parseInt(el.dataset.baseSize, 10);
      if (Number.isNaN(baseSize)) continue;
      el.style.height = `${heightDelta + baseSize}px`;
    }

    for (const container of this.element.querySelectorAll(".resizable-editor[data-editor-size]")) {
      const editorSize = Number.parseInt(container.dataset.editorSize, 10);
      if (Number.isNaN(editorSize)) continue;
      for (const editor of container.querySelectorAll(".editor")) {
        editor.style.height = `${heightDelta + editorSize}px`;
      }
    }
  }

  _getItemFromTarget(target) {
    const li = target?.closest(".item-entry");
    return li ? this.actor.items.get(li.dataset.itemId) : undefined;
  }

  _setListCollapsed(caretRoot, list, collapsed) {
    list.style.display = collapsed ? "none" : "";
    const caret = caretRoot?.querySelector(".fas.fa-caret-down, .fas.fa-caret-right");
    if (!caret) return;
    caret.classList.toggle("fa-caret-down", !collapsed);
    caret.classList.toggle("fa-caret-right", collapsed);
  }

  _restoreCollapsedState() {
    for (const title of this.element.querySelectorAll(".inventory .item-category-title[data-category]")) {
      const list = title.nextElementSibling;
      if (!list?.classList.contains("item-list")) continue;
      this._setListCollapsed(title, list, this.#collapsedCategories.has(title.dataset.category));
    }

    for (const container of this.element.querySelectorAll(".inventory .container")) {
      const list = container.querySelector(".item-list.contained-items");
      if (!list) continue;
      this._setListCollapsed(
        container.querySelector(".item-header"),
        list,
        this.#collapsedContainers.has(container.dataset.itemId),
      );
    }
  }

  _toggleItemCategory(target) {
    const list = target.nextElementSibling;
    if (!list?.classList.contains("item-list")) return;
    const collapsed = list.style.display !== "none";
    const { category } = target.dataset;
    if (collapsed) this.#collapsedCategories.add(category);
    else this.#collapsedCategories.delete(category);
    this._setListCollapsed(target, list, collapsed);
  }

  _toggleContainedItems(target) {
    const container = target.closest(".container");
    const list = container?.querySelector(".item-list.contained-items");
    if (!list) return;
    const collapsed = list.style.display !== "none";
    if (collapsed) this.#collapsedContainers.add(container.dataset.itemId);
    else this.#collapsedContainers.delete(container.dataset.itemId);
    this._setListCollapsed(container.querySelector(".item-header"), list, collapsed);
  }

  _toggleItemSummary(target) {
    const item = target.closest(".item-entry.item");
    const itemSummary = item?.querySelector(".item-summary");
    if (!itemSummary) return;
    if (itemSummary.classList.contains("expanded")) this._expanded.delete(item.dataset.itemId);
    else this._expanded.add(item.dataset.itemId);
    itemSummary.classList.toggle("expanded");
  }

  async _promptRemoveItemFromActor(item) {
    return foundry.applications.api.DialogV2.confirm({
      window: {
        title: game.i18n.localize("OSE.dialog.deleteItem"),
      },
      content: game.i18n.format("OSE.dialog.confirmDeleteItem", {
        name: item.name,
      }),
      yes: {
        default: false,
        callback: () => {
          this._removeItemFromActor(item);
        },
      },
      defaultYes: false,
    });
  }

  async _removeItemFromActor(item) {
    if (item.type === "ability" || item.type === "spell") {
      return this.actor.deleteEmbeddedDocuments("Item", [item._id]);
    }
    if (item.type !== "container" && item.system.containerId !== "") {
      const { containerId } = item.system;
      const newItemIds = this.actor.items.get(containerId).system.itemIds.filter((o) => o !== item.id);

      await this.actor.updateEmbeddedDocuments("Item", [{ _id: containerId, system: { itemIds: newItemIds } }]);
    }
    if (item.type === "container" && item.system.itemIds) {
      const containedItems = item.system.itemIds;
      const updateData = containedItems.reduce((acc, val) => {
        if (this.actor.items.get(val)) acc.push({ _id: val, "system.containerId": "" });
        return acc;
      }, []);

      await this.actor.updateEmbeddedDocuments("Item", updateData);
    }

    this.actor.deleteEmbeddedDocuments("Item", [item._id]);
  }

  async _onSpellChange(event) {
    event.preventDefault();
    const item = this._getItemFromTarget(event.target);
    if (!item) return;
    if (event.target.dataset.field === "cast") {
      return item.update({ "system.cast": Number.parseInt(event.target.value, 10) });
    }
    if (event.target.dataset.field === "memorize") {
      return item.update({
        "system.memorized": Number.parseInt(event.target.value, 10),
      });
    }
  }

  async _updateItemQuantity(event) {
    event.preventDefault();
    const item = this._getItemFromTarget(event.target);
    if (!item) return;

    if (event.target.dataset.field === "value") {
      return item.update({
        "system.quantity.value": Number.parseInt(event.target.value, 10),
      });
    }
    if (event.target.dataset.field === "max") {
      return item.update({
        "system.quantity.max": Number.parseInt(event.target.value, 10),
      });
    }
  }

  async _chooseItemType(choices = ["weapon", "armor", "shield", "gear"]) {
    const templateData = {
      types: choices.reduce((obj, choice) => {
        obj[choice] = choice;
        return obj;
      }, {}),
    };
    const dlg = await foundry.applications.handlebars.renderTemplate(
      `${OSE.systemPath()}/templates/items/entity-create.html`,
      templateData,
    );
    return new Promise((resolve) => {
      new foundry.applications.api.DialogV2({
        window: { title: game.i18n.localize("OSE.dialog.createItem") },
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

  _createItem(target) {
    const { treasure, type, lvl } = target.dataset;
    const createItem = (itemType, name) => ({
      name: name || `New ${itemType.capitalize()}`,
      type: itemType,
    });

    if (type === "choice") {
      const choices = target.dataset.choices.split(",");
      this._chooseItemType(choices).then((dialogInput) => {
        const itemData = createItem(dialogInput.type, dialogInput.name);
        this.actor.createEmbeddedDocuments("Item", [itemData], {});
      });
      return;
    }

    const itemData = createItem(type);
    if (treasure) itemData.system = { treasure: true };
    if (type === "spell") itemData.system = lvl ? { lvl } : { lvl: 1 };
    return this.actor.createEmbeddedDocuments("Item", [itemData], {});
  }

  async _createDroppedItems(items) {
    const data = items.map((item) => {
      const source = item.inCompendium
        ? game.items.fromCompendium(item, { clearFolder: true, keepId: false })
        : item.toObject();
      source.system = { ...source.system, containerId: "" };
      if (source.type === "container") source.system.itemIds = [];
      return source;
    });
    return this.actor.createEmbeddedDocuments("Item", data);
  }

  async _onDropFolder(_event, folder) {
    if (!this.actor.isOwner || folder.type !== "Item") return null;

    const entries = [...folder.contents];
    for (const subfolder of folder.getSubfolders(true)) entries.push(...subfolder.contents);

    const items = await Promise.all(entries.map((entry) => fromUuid(entry.uuid)));
    await this._createDroppedItems(items.filter(Boolean));
    return folder;
  }

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return null;

    const targetId = event.target.closest(".item")?.dataset?.itemId;
    if (item.id === targetId) return null;

    const targetItem = targetId ? this.actor.items.get(targetId) : undefined;
    const targetIsContainer = targetItem?.type === "container";
    const exists = this.actor.items.has(item.id);
    const sourceContainer = this.actor.items.get(item.system.containerId);

    if (!exists && !targetIsContainer) {
      const [created] = await this._createDroppedItems([item]);
      return created ?? null;
    }
    if (sourceContainer) return this._onContainerItemRemove(item, sourceContainer);
    if (targetIsContainer) return this._onContainerItemAdd(item, targetItem);

    const sorted = await this._onSortItem(event, item);
    return sorted?.length ? item : null;
  }

  async _onContainerItemRemove(item, container) {
    const newList = container.system.itemIds.filter((id) => id !== item.id);
    const itemObj = this.actor.items.get(item.id);
    await container.update({ system: { itemIds: newList } });
    await itemObj.update({ system: { containerId: "" } });
    return itemObj;
  }

  async _onContainerItemAdd(item, target) {
    const alreadyExistsInActor = target.parent.items.has(item.id);
    let latestItem = item;
    if (!alreadyExistsInActor) {
      [latestItem] = await this._createDroppedItems([item]);
    }
    if (!latestItem) return null;

    if (!target.system.itemIds.includes(latestItem.id)) {
      const newList = [...target.system.itemIds, latestItem.id];
      await target.update({ system: { itemIds: newList } });
      await latestItem.update({ system: { containerId: target.id, equipped: false } });
    }
    return latestItem;
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onConfigureActor() {
    OseEntityTweaks.open(this.actor, {
      position: {
        top: this.position.top + 40,
        left: this.position.left + (this.position.width - 400) / 2,
      },
    });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onToggleCategory(event, target) {
    event.preventDefault();
    this._toggleItemCategory(target);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onToggleContainedItems(event, target) {
    event.preventDefault();
    this._toggleContainedItems(target);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onToggleItemSummary(event, target) {
    event.preventDefault();
    this._toggleItemSummary(target);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onShowItem(_event, target) {
    return this._getItemFromTarget(target)?.show();
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onEditItem(_event, target) {
    return this._getItemFromTarget(target)?.sheet?.render({ force: true });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onDeleteItem(_event, target) {
    const item = this._getItemFromTarget(target);
    if (item) return this._promptRemoveItemFromActor(item);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onCreateItem(event, target) {
    event.preventDefault();
    return this._createItem(target);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onConsumeUse(_event, target) {
    return this._changeConsumableQuantity(target, -1);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRestoreUse(_event, target) {
    return this._changeConsumableQuantity(target, 1);
  }

  _changeConsumableQuantity(target, delta) {
    const item = this._getItemFromTarget(target);
    if (!item) return null;
    return item.update({
      "system.quantity.value": item.system.quantity.value + delta,
    });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static async _onResetSpells(_event, target) {
    const spellsContainer = target.closest(".inventory.spells");
    const updates = [];

    for (const el of spellsContainer.querySelectorAll(".item-entry")) {
      const item = this.actor.items.get(el.dataset.itemId);
      if (item?.system) {
        updates.push({ _id: item.id, "system.cast": item.system.memorized });
      }
    }

    if (updates.length > 0) await this.actor.updateEmbeddedDocuments("Item", updates);
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static async _onRollItem(event, target) {
    if (!target.closest(".item-rollable")) return;
    const item = this._getItemFromTarget(target);
    if (!item) return;

    if (item.type === "weapon") {
      if (this.actor.type === "monster") {
        await item.update({ "system.counter.value": item.system.counter.value - 1 });
      }
      item.rollWeapon({ skipDialog: skipRollDialogCheck(event) });
    } else if (item.type === "spell") {
      await item.spendSpell({ skipDialog: skipRollDialogCheck(event) });
    } else {
      await item.rollFormula({ skipDialog: skipRollDialogCheck(event) });
    }
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollSave(event, target) {
    const { save } = target.closest("[data-save]")?.dataset ?? {};
    if (save) this.actor.rollSave(save, { event });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollAttack(event, target) {
    const { attack } = target.closest("[data-attack]")?.dataset ?? {};
    this.actor.targetAttack({ roll: {} }, attack, {
      type: attack,
      skipDialog: skipRollDialogCheck(event),
    });
  }

  // biome-ignore lint/complexity/noThisInStatic: V2 actions bind `this` to the application instance.
  static _onRollHitDice(event) {
    this.actor.rollHitDice({ event });
  }
}
