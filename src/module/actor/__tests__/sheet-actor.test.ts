/**
 * @file Contains tests for Actor Sheet.
 */
import type { QuenchMethods } from "../../../e2e";
import {
  cleanUpActorsByKey,
  cleanUpMacros,
  cleanUpWorldItems,
  closeSheets,
  closeV2Dialogs,
  createActorTestItem,
  createMockActorKey,
  createMockMacro,
  createWorldTestItem,
  delay,
  itemTypes,
  openV2AppsByClass,
  openV2Dialogs,
  trashChat,
  waitFor,
  waitForElement,
} from "../../../e2e/testUtils";
import OseActorSheet from "../actor-sheet";

export const key = "ose.actor.sheet";
export const options = {
  displayName: "OSE: Actor: Sheet",
  preSelected: true,
};

type TestContext = { timeout: (ms: number) => void };

type SheetUnderTest = {
  element: HTMLElement;
  render: (options: object) => Promise<unknown>;
  changeTab: (tab: string, group: string) => void;
};

const getActor = () => game.actors?.getName(`Test Actor ${key}`);

const sheetRoot = (): HTMLElement => getActor()?.sheet?.element;

const renderSheet = async (actor: { sheet: SheetUnderTest }): Promise<HTMLElement> => {
  await actor.sheet.render({ force: true });
  return actor.sheet.element;
};

const showTab = (actor: { sheet: SheetUnderTest }, tab: string) => {
  actor.sheet.changeTab(tab, "primary");
};

const tabFor = (itemType: string) => {
  if (itemType === "spell") return "spells";
  if (itemType === "ability") return "abilities";
  return "inventory";
};

const click = (element: Element | null | undefined) => {
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const inTab = (tab: string, selector: string) => `.tab[data-tab="${tab}"] ${selector}`;

export default ({ describe, it, expect, assert, after, afterEach, before }: QuenchMethods) => {
  const originalCtrlSetting = game.settings.get(game.system.id, "invertedCtrlBehavior");

  after(async () => {
    await cleanUpActorsByKey(key);
    await closeSheets();
    await game.settings.set(game.system.id, "invertedCtrlBehavior", originalCtrlSetting);
  });

  describe("DEFAULT_OPTIONS", () => {
    it("Has correctly set defaults", () => {
      const opts = OseActorSheet.DEFAULT_OPTIONS;
      expect(opts.classes).contain("ose");
      expect(opts.classes).contain("sheet");
      expect(opts.classes).contain("actor");
      expect(opts.tag).equal("form");
      assert(opts.form.submitOnChange);
      assert(!opts.form.closeOnSubmit);
      assert(opts.window.resizable);
    });

    it("Registers the shared sheet actions", () => {
      const actions = Object.keys(OseActorSheet.DEFAULT_OPTIONS.actions);
      expect(actions).contain("configureActor");
      expect(actions).contain("consumeUse");
      expect(actions).contain("createItem");
      expect(actions).contain("deleteItem");
      expect(actions).contain("editItem");
      expect(actions).contain("resetSpells");
      expect(actions).contain("restoreUse");
      expect(actions).contain("rollAttack");
      expect(actions).contain("rollHitDice");
      expect(actions).contain("rollItem");
      expect(actions).contain("rollSave");
      expect(actions).contain("showItem");
      expect(actions).contain("toggleCategory");
      expect(actions).contain("toggleContainedItems");
      expect(actions).contain("toggleItemSummary");
    });
  });

  describe("_prepareContext(options)", () => {
    it("returns the expected data", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const data = await actor?.sheet?._prepareContext({});

      expect(data.owner).equal(actor?.isOwner);
      expect(data.editable).equal(actor?.sheet?.isEditable);
      expect(Object.keys(data.config)).contain("ascendingAC");
      expect(Object.keys(data.config)).contain("initiative");
      expect(Object.keys(data.config)).contain("encumbrance");
      expect(data.isNew).equal(actor?.isNew());
      expect(Object.keys(data)).contain("tabs");

      await actor?.delete();
    });
  });

  describe("_getItemFromTarget(target)", () => {
    for (const itemType of itemTypes) {
      it(`Can get an ${itemType} item`, async function (this: TestContext) {
        this.timeout(5000);
        const actor = await createMockActorKey("character", {}, key);
        await actor?.update({ system: { spells: { enabled: true } } });
        const root = await renderSheet(actor);

        const [item] = await createActorTestItem(actor, itemType);
        const row = await waitForElement(inTab(tabFor(itemType), `.item-entry[data-item-id="${item.id}"]`), { root });
        expect(row).not.null;

        expect(actor?.sheet?._getItemFromTarget(row?.querySelector(".item-name"))?.id).equal(item.id);
      });
    }

    it("returns undefined for a target outside an item row", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const root = await renderSheet(actor);
      expect(actor?.sheet?._getItemFromTarget(root)).is.undefined;
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_toggleItemCategory(target)", () => {
    const categoryList = () => sheetRoot().querySelector<HTMLElement>(inTab("inventory", ".item-list"));

    const clickCategory = () => {
      click(sheetRoot().querySelector(inTab("inventory", ".item-category-title")));
    };

    before(async () => {
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      await renderSheet(actor);
    });

    it("clicking the category name hides the item category", () => {
      expect(openV2AppsByClass("sheet").length).equal(1);
      expect(categoryList()?.style.display).equal("");
      clickCategory();
      expect(categoryList()?.style.display).equal("none");
    });

    it("clicking the category name again shows the item category", () => {
      expect(openV2AppsByClass("sheet").length).equal(1);
      expect(categoryList()?.style.display).equal("none");
      clickCategory();
      expect(categoryList()?.style.display).equal("");
    });

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_toggleContainedItems(target)", () => {
    const containedList = () =>
      sheetRoot().querySelector<HTMLElement>(inTab("inventory", ".container .contained-items"));

    const clickContainerCaret = () => {
      click(sheetRoot().querySelector(inTab("inventory", ".container .category-caret")));
    };

    before(async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [container] = await createActorTestItem(actor, "container");
      const [weapon] = await createActorTestItem(actor, "weapon");
      await weapon?.update({ system: { containerId: container?.id } });
      const root = await renderSheet(actor);
      await waitForElement(inTab("inventory", ".container .contained-items .item-entry"), { root });
    });

    it("clicking container caret will hide the content", () => {
      expect(openV2AppsByClass("sheet").length).equal(1);
      expect(getActor()?.items.size).equal(2);
      expect(containedList()?.style.display).equal("");
      clickContainerCaret();
      expect(containedList()?.style.display).equal("none");
    });

    it("clicking container caret again will show the content", () => {
      expect(openV2AppsByClass("sheet").length).equal(1);
      expect(containedList()?.style.display).equal("none");
      clickContainerCaret();
      expect(containedList()?.style.display).equal("");
    });

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_toggleItemSummary(target)", () => {
    before(async () => {
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      await renderSheet(actor);
    });

    for (const itemType of itemTypes) {
      const tab = tabFor(itemType);
      const summary = () => sheetRoot().querySelector<HTMLElement>(inTab(tab, ".item-summary"));

      const clickItemName = () => {
        click(sheetRoot().querySelector(inTab(tab, ".item-name")));
      };

      describe(`for type ${itemType}`, () => {
        let itemName = "";

        before(async function (this: TestContext) {
          this.timeout(5000);
          const actor = getActor();
          const [item] = await createActorTestItem(actor, itemType);
          itemName = item.name;
          showTab(actor, tab);
          await waitForElement(inTab(tab, `.item-entry[data-item-id="${item.id}"]`), { root: sheetRoot() });
        });

        it("clicking item name will show the content", () => {
          expect(getActor()?.items.size).equal(1);
          expect([...(summary()?.classList ?? [])])
            .to.be.an("array")
            .that.does.not.include("expanded");

          clickItemName();
          expect([...(summary()?.classList ?? [])])
            .to.be.an("array")
            .that.includes("expanded");
        });

        it("clicking item name again will hide the content", () => {
          expect([...(summary()?.classList ?? [])])
            .to.be.an("array")
            .that.includes("expanded");

          clickItemName();
          expect([...(summary()?.classList ?? [])])
            .to.be.an("array")
            .that.does.not.include("expanded");
        });

        it("item containing description still shows the summary", async () => {
          const item = getActor()?.items.getName(itemName);
          await item?.update({ system: { description: "hello world" } });
          await waitFor(() => !!summary()?.innerHTML.includes("hello world"));

          expect(item?.system.description).equal("hello world");
          expect(summary()?.innerHTML).contain("hello world");

          await item?.update({ system: { description: "" } });
        });

        it("item containing macro reference still shows the summary, Issue #353", async function (this: TestContext) {
          this.timeout(5000);
          const macro = await createMockMacro();
          const item = getActor()?.items.getName(itemName);
          await item?.update({
            system: { description: `<p>@UUID[${macro?.uuid}]{Mock Macro}</p>` },
          });
          await waitFor(() => !!summary()?.querySelector(`a[data-uuid="${macro?.uuid}"]`));

          expect(summary()).is.not.null;
          expect(summary()?.querySelector(`a[data-uuid="${macro?.uuid}"]`)).is.not.null;

          await item?.update({ system: { description: "" } });
          await macro?.delete();
        });

        after(async () => {
          for (const item of getActor()?.items ?? []) {
            await item.delete();
          }
          await cleanUpMacros();
        });
      });
    }

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onShowItem(event, target)", () => {
    before(async () => {
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      await renderSheet(actor);
    });

    for (const itemType of itemTypes) {
      const tab = tabFor(itemType);

      it(`can show ${itemType}`, async function (this: TestContext) {
        this.timeout(5000);
        await trashChat();
        const actor = getActor();
        const [item] = await createActorTestItem(actor, itemType);
        const root = sheetRoot();
        await waitForElement(inTab(tab, `.item-entry[data-item-id="${item.id}"]`), { root });

        click(root.querySelector(inTab(tab, `.item-entry[data-item-id="${item.id}"] .item-show`)));
        await waitFor(() => (game.messages?.size ?? 0) === 1);

        expect(game.messages?.size).equal(1);
        expect(game.messages?.contents[0]?.content).contain(item.name);

        for (const owned of actor?.items ?? []) {
          await owned.delete();
        }
      });
    }

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
      await trashChat();
    });
  });

  describe("_removeItemFromActor(item)", () => {
    before(async () => {
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      await renderSheet(actor);
    });

    for (const itemType of itemTypes) {
      describe(`${itemType} item`, () => {
        it("can remove item outside container", async () => {
          const actor = getActor();
          expect(actor?.items.size).equal(0);

          const [item] = await createActorTestItem(actor, itemType);
          expect(actor?.items.size).equal(1);

          await actor?.sheet?._removeItemFromActor(item);
          await waitFor(() => actor?.items.size === 0);
          expect(actor?.items.size).equal(0);
        });

        if (itemType !== "container" && itemType !== "spell" && itemType !== "ability") {
          it("can remove item inside container", async function (this: TestContext) {
            this.timeout(5000);
            const actor = getActor();
            expect(actor?.items.size).equal(0);

            const [container] = await createActorTestItem(actor, "container");
            const [item] = await createActorTestItem(actor, itemType);
            expect(actor?.items.size).equal(2);

            await actor?.sheet?._onContainerItemAdd(item, container);
            await actor?.sheet?._removeItemFromActor(item);
            await waitFor(() => actor?.items.size === 1);

            expect(actor?.items.size).equal(1);
            expect(container?.system.itemIds.length).equal(0);

            await actor?.sheet?._removeItemFromActor(container);
            await waitFor(() => actor?.items.size === 0);
            expect(actor?.items.size).equal(0);
          });

          it("removing container with item inside deletes just container", async function (this: TestContext) {
            this.timeout(5000);
            const actor = getActor();
            expect(actor?.items.size).equal(0);

            const [container] = await createActorTestItem(actor, "container");
            const [item] = await createActorTestItem(actor, itemType);
            expect(actor?.items.size).equal(2);

            await actor?.sheet?._removeItemFromActor(container);
            await waitFor(() => actor?.items.size === 1);
            expect(actor?.items.size).equal(1);

            await actor?.sheet?._removeItemFromActor(item);
            await waitFor(() => actor?.items.size === 0);
            expect(actor?.items.size).equal(0);
          });
        }
      });
    }

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_changeConsumableQuantity(target, delta)", () => {
    before(async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [item] = await createActorTestItem(actor, "item");
      await item?.update({ system: { quantity: { max: 6, value: 3 } } });
      const root = await renderSheet(actor);
      await waitForElement(inTab("inventory", ".full-mark"), { root });
    });

    it("can decrease value", async () => {
      const item = getActor()?.items.contents[0];
      expect(item?.system.quantity.value).equal(3);

      click(sheetRoot().querySelector(inTab("inventory", ".full-mark")));
      await waitFor(() => item?.system.quantity.value === 2);
      expect(item?.system.quantity.value).equal(2);
    });

    it("can increase value", async () => {
      const item = getActor()?.items.contents[0];
      expect(item?.system.quantity.value).equal(2);

      await waitForElement(inTab("inventory", ".empty-mark"), { root: sheetRoot() });
      click(sheetRoot().querySelector(inTab("inventory", ".empty-mark")));
      await waitFor(() => item?.system.quantity.value === 3);
      expect(item?.system.quantity.value).equal(3);
    });

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onSpellChange(event)", () => {
    const changeSpellField = async (field: string, value: string) => {
      const input = await waitForElement<HTMLInputElement>(inTab("spells", `input[data-field="${field}"]`), {
        root: sheetRoot(),
      });
      expect(input).is.not.null;
      if (!input) return;
      input.value = value;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    before(async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      await createActorTestItem(actor, "spell");
      const root = await renderSheet(actor);
      await waitForElement(inTab("spells", `input[data-field="cast"]`), { root });
    });

    it("changing the input for cast changes spell cast data", async () => {
      const item = getActor()?.items.contents[0];
      await changeSpellField("cast", "3");
      await waitFor(() => item?.system.cast === 3);
      expect(item?.system.cast).equal(3);
    });

    it("changing the input for memorize changes spell memorize data", async () => {
      const item = getActor()?.items.contents[0];
      await changeSpellField("memorize", "3");
      await waitFor(() => item?.system.memorized === 3);
      expect(item?.system.memorized).equal(3);
    });

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onResetSpells(event, target)", () => {
    before(async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      const [spell] = await createActorTestItem(actor, "spell");
      await spell?.update({ system: { cast: 1, memorized: 3 } });
      const root = await renderSheet(actor);
      await waitForElement(`[data-action="resetSpells"]`, { root });
    });

    it("resetting spells resets the cast field to maximum", async () => {
      const item = getActor()?.items.contents[0];
      click(sheetRoot().querySelector(`[data-action="resetSpells"]`));
      await waitFor(() => item?.system.cast === item?.system.memorized);
      expect(item?.system.cast).equal(item?.system.memorized);
    });

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onRollItem(event, target)", () => {
    const clickItemImage = async (tab: string, itemId: string) => {
      const root = sheetRoot();
      const selector = inTab(tab, `.item-entry[data-item-id="${itemId}"] .item-image`);
      await waitForElement(selector, { root });
      click(root.querySelector(selector));
    };

    before(async () => {
      await game.settings.set(game.system.id, "invertedCtrlBehavior", true);
      await trashChat();
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
      await trashChat();
    });

    it("rolling weapon on monster updates the counter value", async function (this: TestContext) {
      this.timeout(5000);
      expect(game.messages?.size).equal(0);

      const actor = await createMockActorKey("monster", {}, key);
      const [weapon] = await createActorTestItem(actor, "weapon");
      await weapon?.update({ system: { counter: { value: 3, max: 3 } } });
      expect(actor?.items.size).equal(1);
      await renderSheet(actor);
      await clickItemImage("attributes", weapon.id);
      await waitFor(() => (game.messages?.size ?? 0) === 1);

      expect(game.messages?.size).equal(1);
      expect(game.messages?.contents[0].content).contain(
        `<h2>${game.i18n.format("OSE.roll.attacksWith", { name: weapon.name })}</h2>`,
      );
      await waitFor(() => weapon?.system.counter.value === 2);
      expect(weapon?.system.counter.value).equal(2);
    });

    it("rolling weapon on character rolls weapon", async function (this: TestContext) {
      this.timeout(5000);
      expect(game.messages?.size).equal(0);

      const actor = await createMockActorKey("character", {}, key);
      const [weapon] = await createActorTestItem(actor, "weapon");
      expect(actor?.items.size).equal(1);
      await renderSheet(actor);
      await clickItemImage("inventory", weapon.id);
      await waitFor(() => (game.messages?.size ?? 0) === 1);

      expect(game.messages?.size).equal(1);
      expect(game.messages?.contents[0].content).contain(
        `<h2>${game.i18n.format("OSE.roll.attacksWith", { name: weapon.name })}</h2>`,
      );
    });

    it("rolling spell rolls and spends the spell", async function (this: TestContext) {
      this.timeout(5000);
      expect(game.messages?.size).equal(0);

      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { spells: { enabled: true } } });
      const [spell] = await createActorTestItem(actor, "spell");
      expect(actor?.items.size).equal(1);
      await renderSheet(actor);
      await clickItemImage("spells", spell.id);
      await waitFor(() => (game.messages?.size ?? 0) === 1);

      expect(game.messages?.size).equal(1);
      expect(game.messages?.contents[0].content).contain(`<h2>${spell.name}</h2>`);
    });

    it("rolling anything else rolls the formula", async function (this: TestContext) {
      this.timeout(5000);
      expect(game.messages?.size).equal(0);

      const actor = await createMockActorKey("character", {}, key);
      const [ability] = await createActorTestItem(actor, "ability");
      await ability?.update({ system: { roll: "1d6" } });
      expect(ability?.system.roll).equal("1d6");
      await renderSheet(actor);
      await clickItemImage("abilities", ability.id);
      await waitFor(() => (game.messages?.size ?? 0) === 1);

      expect(game.messages?.size).equal(1);
      expect(game.messages?.contents[0].content).contain(
        `<h2>${game.i18n.format("OSE.roll.formula", { label: ability.name })}</h2>`,
      );
    });

    it("rolling an item that is not rollable does nothing", async function (this: TestContext) {
      this.timeout(5000);
      expect(game.messages?.size).equal(0);

      const actor = await createMockActorKey("character", {}, key);
      const [gear] = await createActorTestItem(actor, "item");
      await renderSheet(actor);
      await clickItemImage("inventory", gear.id);
      await delay(120);

      expect(game.messages?.size).equal(0);
    });
  });

  describe("_onRollSave(event, target)", () => {
    const saves = ["death", "wand", "paralysis", "breath", "spell"];

    const clickSave = async (save: string) => {
      const root = sheetRoot();
      await waitForElement(`li[data-save="${save}"] a`, { root });
      click(root.querySelector(`li[data-save="${save}"] a`));
    };

    for (const actorType of ["character", "monster"]) {
      describe(`${actorType} can roll`, () => {
        before(async () => {
          await game.settings.set(game.system.id, "invertedCtrlBehavior", true);
          const actor = await createMockActorKey(actorType, {}, key);
          await renderSheet(actor);
          await trashChat();
        });

        for (const save of saves) {
          it(`${save} save`, async () => {
            await trashChat();
            await waitFor(() => (game.messages?.size ?? 0) === 0);
            expect(game.messages?.size).equal(0);

            await clickSave(save);
            await waitFor(() => (game.messages?.size ?? 0) === 1);

            expect(game.messages?.size).equal(1);
            expect(game.messages?.contents[0].content).contain(
              game.i18n.format("OSE.roll.save", {
                save: game.i18n.localize(`OSE.saves.${save}.long`),
              }),
            );
          });
        }

        after(async () => {
          await cleanUpActorsByKey(key);
          await closeSheets();
          await trashChat();
        });
      });
    }
  });

  describe("_onRollAttack(event, target)", () => {
    const attackTypes = ["melee", "missile"];

    const clickAttack = async (attack: string) => {
      const root = sheetRoot();
      await waitForElement(`li[data-attack="${attack}"] a`, { root });
      click(root.querySelector(`li[data-attack="${attack}"] a`));
    };

    before(async () => {
      await game.settings.set(game.system.id, "invertedCtrlBehavior", true);
      const actor = await createMockActorKey("character", {}, key);
      await renderSheet(actor);
      await trashChat();
    });

    for (const attack of attackTypes) {
      it(`can attack with ${attack}`, async () => {
        const actor = getActor();
        expect(game.messages?.size).equal(0);

        await clickAttack(attack);
        await waitFor(() => (game.messages?.size ?? 0) === 1);

        expect(game.messages?.size).equal(1);
        expect(game.messages?.contents[0].content).contain(game.i18n.format("OSE.roll.attacks", { name: actor?.name }));
        await trashChat();
        await waitFor(() => (game.messages?.size ?? 0) === 0);
      });
    }

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
      await trashChat();
    });
  });

  const containerPreflightCheck = (sourceItemName: string, source: unknown, target: unknown) => {
    const sourceItem = source as { documentName: string; name: string; system: { containerId: string } };
    const targetItem = target as { system: { itemIds: string[] } };

    expect(sourceItem).not.undefined;
    expect(sourceItem.documentName).equal("Item");
    expect(sourceItem.name).equal(sourceItemName);
    expect(sourceItem.system.containerId).equal("");
    expect(targetItem.system.itemIds.length).equal(0);
  };

  const containerPostflightCheck = (actor: unknown, source: unknown, target: unknown) => {
    const sourceItem = source as { id: string; type: string; system: { containerId: string } };
    const targetItem = target as { id: string; system: { itemIds: string[] } };
    const owner = actor as { system: Record<string, unknown[]> };

    expect(targetItem.system.itemIds.length).equal(1);
    expect(targetItem.system.itemIds).contain(sourceItem.id);
    expect(sourceItem.system.containerId).equal(targetItem.id);

    const getter = sourceItem.type === "armor" ? sourceItem.type : `${sourceItem.type}s`;
    expect(owner.system[getter]?.length).equal(getter === "containers" ? 1 : 0);
  };

  describe("_onContainerItemAdd(item, target)", () => {
    for (const itemType of itemTypes) {
      if (itemType === "spell" || itemType === "ability") continue;

      it(`add ${itemType} to container`, async () => {
        const actor = await createMockActorKey("character", {}, key);
        const [container] = await createActorTestItem(actor, "container", "TargetContainer");
        const [item] = await createActorTestItem(actor, itemType);

        containerPreflightCheck(item.name, item, container);
        await actor?.sheet?._onContainerItemAdd(item, container);
        containerPostflightCheck(actor, item, container);
      });
    }

    afterEach(async () => {
      await cleanUpActorsByKey(key);
    });
  });

  describe("_onContainerItemRemove(item, container)", () => {
    for (const itemType of itemTypes) {
      if (itemType === "spell" || itemType === "ability") continue;

      it(`remove ${itemType} from container`, async () => {
        const actor = await createMockActorKey("character", {}, key);
        const [container] = await createActorTestItem(actor, "container", "TargetContainer");
        const [item] = await createActorTestItem(actor, itemType);

        await actor?.sheet?._onContainerItemAdd(item, container);
        containerPostflightCheck(actor, item, container);

        await actor?.sheet?._onContainerItemRemove(item, container);
        containerPreflightCheck(item.name, item, container);
      });
    }

    afterEach(async () => {
      await cleanUpActorsByKey(key);
    });
  });

  describe("_createDroppedItems(items)", () => {
    for (const itemType of itemTypes) {
      if (itemType === "spell" || itemType === "ability") continue;

      it(`add non-actor ${itemType} to sheet`, async () => {
        const actor = await createMockActorKey("character", {}, key);
        const worldItem = await createWorldTestItem(itemType);

        const [created] = await actor.sheet._createDroppedItems([worldItem]);

        expect(created).not.undefined;
        expect(created.name).equal(worldItem?.name);
        expect(created.type).equal(itemType);
        expect(actor?.items.getName(worldItem?.name)).not.undefined;
      });
    }

    it("empties the itemIds of a dropped container", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const worldItem = await createWorldTestItem("container");
      await worldItem?.update({ system: { itemIds: ["not-a-real-id"] } });

      const [created] = await actor.sheet._createDroppedItems([worldItem]);
      expect(created.system.itemIds.length).equal(0);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await cleanUpWorldItems();
    });
  });

  describe("_chooseItemType(choices)", () => {
    const defaultChoices = ["weapon", "armor", "shield", "gear"];

    it("can create standard dialog", async () => {
      const actor = await createMockActorKey("monster", {}, key);
      actor?.sheet?._chooseItemType();
      await waitFor(() => openV2Dialogs().length === 1);

      const dialogs = openV2Dialogs();
      expect(dialogs.length).equal(1);
      for (const choice of defaultChoices) {
        expect(dialogs[0]?.element.querySelector(`option[value="${choice}"]`)).is.not.null;
      }
      await dialogs[0]?.close();
    });

    it("can create custom dialog", async () => {
      const customChoices = ["test", "test2", "test3"];
      const actor = await createMockActorKey("monster", {}, key);
      actor?.sheet?._chooseItemType(customChoices);
      await waitFor(() => openV2Dialogs().length === 1);

      const dialogs = openV2Dialogs();
      expect(dialogs.length).equal(1);
      for (const choice of customChoices) {
        expect(dialogs[0]?.element.querySelector(`option[value="${choice}"]`)).is.not.null;
      }
      await dialogs[0]?.close();
    });

    afterEach(async () => {
      await closeV2Dialogs();
      await cleanUpActorsByKey(key);
    });
  });

  describe("_createItem(target)", () => {
    for (const itemType of itemTypes) {
      it(`can create ${itemType}`, async function (this: TestContext) {
        this.timeout(5000);
        const actor = await createMockActorKey("character", {}, key);
        await actor?.update({ system: { spells: { enabled: true } } });
        const root = await renderSheet(actor);
        expect(actor?.items.size).equal(0);

        const selector =
          itemType === "item"
            ? `.item-create[data-type="item"]:not([data-treasure])`
            : `.item-create[data-type="${itemType}"]`;
        const control = await waitForElement(selector, { root });
        expect(control).is.not.null;

        click(control);
        await waitFor(() => actor?.items.size === 1);

        expect(actor?.items.size).equal(1);
        expect(actor?.items.contents[0]?.type).equal(itemType);
      });
    }

    it("can create a treasure item", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const root = await renderSheet(actor);

      const control = await waitForElement(`.item-create[data-type="item"][data-treasure="true"]`, { root });
      expect(control).is.not.null;

      click(control);
      await waitFor(() => actor?.items.size === 1);

      expect(actor?.items.contents[0]?.type).equal("item");
      expect(actor?.items.contents[0]?.system.treasure).is.true;
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_updateItemQuantity(event)", () => {
    const updateQuantity = async (itemId: string, modifier: number) => {
      const selector = `.item-entry[data-item-id="${itemId}"] .quantity input[data-field="value"]`;
      const input = await waitForElement<HTMLInputElement>(selector, { root: sheetRoot() });
      expect(input).is.not.null;
      if (!input) return;
      input.value = String(Number.parseInt(input.value, 10) + modifier);
      input.dispatchEvent(new Event("change", { bubbles: true }));
    };

    it("can add to the quantity", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [item] = await createActorTestItem(actor, "item");
      await item.update({ system: { quantity: { value: 2, max: 4 } } });
      await renderSheet(actor);

      expect(item.system.quantity.value).equal(2);
      await updateQuantity(item.id, 1);
      await waitFor(() => item.system.quantity.value === 3);
      expect(item.system.quantity.value).equal(3);
    });

    it("can subtract from the quantity", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [item] = await createActorTestItem(actor, "item");
      await item.update({ system: { quantity: { value: 2, max: 4 } } });
      await renderSheet(actor);

      expect(item.system.quantity.value).equal(2);
      await updateQuantity(item.id, -1);
      await waitFor(() => item.system.quantity.value === 1);
      expect(item.system.quantity.value).equal(1);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_getHeaderControls()", () => {
    it("offers the tweaks control to an owner", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const controls = actor?.sheet?._getHeaderControls();
      expect(controls.some((control: { action?: string }) => control.action === "configureActor")).is.true;
      await actor?.delete();
    });
  });

  describe("_onConfigureActor()", () => {
    for (const actorType of ["character", "monster"]) {
      it(`Entity Tweaks renders for ${actorType}`, async function (this: TestContext) {
        this.timeout(5000);
        const actor = await createMockActorKey(actorType, {}, key);
        const root = await renderSheet(actor);

        const toggle = await waitForElement(`[data-action="toggleControls"]`, { root });
        expect(toggle).is.not.null;
        click(toggle);

        const control = await waitForElement(`[data-action="configureActor"]`, { root });
        expect(control).is.not.null;

        click(control);
        await waitForElement("#entity-tweaks");

        const dialogs = openV2AppsByClass("sheet-tweaks");
        expect(dialogs.length).equal(1);
        expect(dialogs[0]?.element.querySelector(".window-title")?.innerHTML).to.include(`Test Actor ${key}`);

        await dialogs[0]?.close();
      });
    }

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });
};
