/**
 * @file Contains tests for Monster Sheet.
 */
import type { QuenchMethods } from "../../../e2e";
import {
  cleanUpActorsByKey,
  closeSheets,
  closeV2Dialogs,
  createActorTestItem,
  createMockActorKey,
  getMockActorKey,
  openV2Dialogs,
  waitFor,
  waitForElement,
} from "../../../e2e/testUtils";
import OseActorSheetMonster from "../monster-sheet";

export const key = "ose.actor.sheet.monster";
export const options = { displayName: "OSE: Actor: Sheet: Monster" };

type TestContext = { timeout: (ms: number) => void };

type SheetUnderTest = {
  element: HTMLElement;
  render: (options: object) => Promise<unknown>;
};

const renderSheet = async (actor: { sheet: SheetUnderTest }): Promise<HTMLElement> => {
  await actor.sheet.render({ force: true });
  return actor.sheet.element;
};

const click = (element: Element | null | undefined) => {
  element?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};

const createMockRollTable = async () => CONFIG.RollTable.documentClass.create({ name: "Test RollTable" });

const cleanUpRollTables = async () => {
  for (const table of game.tables?.filter((rt: { name: string | null }) => rt.name === "Test RollTable") ?? []) {
    await table.delete();
  }
};

export default ({ describe, it, expect, assert, after, afterEach, before }: QuenchMethods) => {
  const originalCtrlSetting = game.settings.get(game.system.id, "invertedCtrlBehavior");

  after(async () => {
    await game.settings.set(game.system.id, "invertedCtrlBehavior", originalCtrlSetting);
    await cleanUpActorsByKey(key);
    await closeSheets();
  });

  describe("DEFAULT_OPTIONS", () => {
    it("Has correctly set defaults", () => {
      const opts = OseActorSheetMonster.DEFAULT_OPTIONS;
      expect(opts.classes).contain("ose");
      expect(opts.classes).contain("sheet");
      expect(opts.classes).contain("actor");
      expect(opts.classes).contain("monster");
      expect(opts.position.width).equal(450);
      expect(opts.position.height).equal(560);
    });

    it("Registers the monster sheet actions", () => {
      const actions = Object.keys(OseActorSheetMonster.DEFAULT_OPTIONS.actions);
      expect(actions).contain("cyclePattern");
      expect(actions).contain("generateSaves");
      expect(actions).contain("resetAttacks");
      expect(actions).contain("rollAppearing");
      expect(actions).contain("rollHP");
      expect(actions).contain("rollMorale");
      expect(actions).contain("rollReaction");
    });
  });

  describe("PARTS", () => {
    it("Declares one template part per tab", () => {
      const { PARTS } = OseActorSheetMonster;
      expect(PARTS.header.template).contain("/templates/actors/partials/monster-header.html");
      expect(PARTS.tabnav.template).contain("/templates/actors/partials/sheet-tabs.html");
      expect(PARTS.attributes.template).contain("/templates/actors/partials/monster-attributes-tab.html");
      expect(PARTS.inventory.template).contain("/templates/actors/partials/character-inventory-tab.html");
      expect(PARTS.spells.template).contain("/templates/actors/partials/character-spells-tab.html");
      expect(PARTS.notes.template).contain("/templates/actors/partials/monster-notes-tab.html");
    });
  });

  describe("TABS", () => {
    it("Opens on the attributes tab", () => {
      const { primary } = OseActorSheetMonster.TABS;
      expect(primary.initial).equal("attributes");
      expect(primary.tabs.map((tab: { id: string }) => tab.id)).to.eql(["attributes", "inventory", "spells", "notes"]);
    });
  });

  describe("_isTabEnabled(tabId)", () => {
    it("Gates the inventory and spells tabs on the actor config", async () => {
      const actor = await createMockActorKey("monster", {}, key);
      const sheet = actor?.sheet;

      assert(sheet._isTabEnabled("notes"));
      assert(sheet._isTabEnabled("attributes"));
      assert(!sheet._isTabEnabled("inventory"));
      assert(!sheet._isTabEnabled("spells"));

      await actor?.update({ system: { config: { enableInventory: true }, spells: { enabled: true } } });
      assert(sheet._isTabEnabled("inventory"));
      assert(sheet._isTabEnabled("spells"));

      await actor?.delete();
    });
  });

  describe("_prepareContext(options)", () => {
    it("returns the expected data", async () => {
      const actor = await createMockActorKey("monster", {}, key);
      const data = await actor?.sheet?._prepareContext({});

      expect(Object.keys(data)).contain("owned");
      expect(Object.keys(data.owned)).contain("weapons");
      expect(Object.keys(data.owned)).contain("items");
      expect(Object.keys(data.owned)).contain("containers");
      expect(Object.keys(data.owned)).contain("armors");
      expect(Object.keys(data.owned)).contain("treasures");
      expect(Object.keys(data)).contain("attackPatterns");
      expect(Object.keys(data)).contain("spells");
      expect(Object.keys(data)).contain("isNew");
      expect(Object.keys(data)).contain("tabs");

      expect(data.config.morale).equal(game.settings.get(game.system.id, "morale"));
      expect(Object.keys(data)).contain("system");
      expect(Object.keys(data.system)).contain("details");
      expect(Object.keys(data.system.details)).contain("treasure");
      expect(Object.keys(data.system.details.treasure)).contain("link");
      expect(data.encumbranceTemplate).equal("");

      await actor?.delete();
    });
  });

  describe("generateSave()", () => {
    it("renders a dialog", async () => {
      const actor = await createMockActorKey("monster", {}, key);
      actor?.sheet?.generateSave();
      await waitFor(() => openV2Dialogs().length === 1);

      const dialogs = openV2Dialogs();
      expect(dialogs.length).equal(1);
      await dialogs[0]?.close();
    });

    afterEach(async () => {
      await closeV2Dialogs();
      await cleanUpActorsByKey(key);
    });
  });

  describe("_onDropDocument(event, document)", () => {
    it("Dropping a RollTable stores it as the treasure table", async () => {
      const actor = await createMockActorKey("monster", {}, key);
      const rollTable = await createMockRollTable();
      const root = await renderSheet(actor);

      await actor?.sheet?._onDropDocument(
        { target: root, preventDefault: () => {}, dataTransfer: new DataTransfer() },
        rollTable,
      );

      expect(actor?.system.details.treasure.table).equal(`@UUID[RollTable.${rollTable?.id}]`);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await cleanUpRollTables();
      await closeSheets();
    });
  });

  describe("_resetAttacks(event)", () => {
    it("resets the counter to max", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("monster", {}, key);
      const [weapon] = await createActorTestItem(actor, "weapon");
      await weapon.update({ system: { counter: { max: 4, value: 1 } } });
      const root = await renderSheet(actor);

      await waitForElement(`[data-action="resetAttacks"]`, { root });
      expect(weapon.system.counter.value).equal(1);

      click(root.querySelector(`[data-action="resetAttacks"]`));
      await waitFor(() => weapon.system.counter.value === 4);
      expect(weapon.system.counter.value).equal(4);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_updateAttackCounter(event)", () => {
    before(async () => {
      await game.settings.set(game.system.id, "invertedCtrlBehavior", true);
    });

    it("updates counter when rolling", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("monster", {}, key);
      const [weapon] = await createActorTestItem(actor, "weapon");
      await weapon.update({ system: { counter: { max: 4, value: 4 } } });
      const root = await renderSheet(actor);

      const selector = `.item-entry[data-item-id="${weapon.id}"] .item-image`;
      await waitForElement(selector, { root });
      expect(weapon.system.counter.value).equal(4);

      click(root.querySelector(selector));
      await waitFor(() => weapon.system.counter.value === 3);
      expect(weapon.system.counter.value).equal(3);
    });

    it("changing the counter input updates the weapon", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("monster", {}, key);
      const [weapon] = await createActorTestItem(actor, "weapon");
      await weapon.update({ system: { counter: { max: 4, value: 4 } } });
      const root = await renderSheet(actor);

      const input = await waitForElement<HTMLInputElement>(
        `.item-entry[data-item-id="${weapon.id}"] .counter input[data-field="value"]`,
        { root },
      );
      expect(input).is.not.null;
      if (!input) return;

      input.value = "2";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      await waitFor(() => weapon.system.counter.value === 2);
      expect(weapon.system.counter.value).equal(2);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_cycleAttackPatterns(event)", () => {
    const colors = [...Object.keys(CONFIG.OSE.colors), "transparent"];

    before(async () => {
      const actor = await createMockActorKey("monster", {}, key);
      await createActorTestItem(actor, "weapon");
      const root = await renderSheet(actor);
      await waitForElement(`[data-action="cyclePattern"]`, { root });
    });

    describe("properly cycles between colors", () => {
      for (const color of colors) {
        it(`works for color ${color}`, async () => {
          const actor = await getMockActorKey(key);
          const item = actor?.items.contents[0];
          const currentPattern = item?.system.pattern;

          expect(currentPattern).not.undefined;
          const patternIndex = colors.indexOf(currentPattern);
          const nextIndex = patternIndex + 1 === colors.length ? 0 : patternIndex + 1;

          click(actor?.sheet?.element.querySelector(`[data-action="cyclePattern"]`));
          await waitFor(() => item?.system.pattern === colors[nextIndex]);

          expect(item?.system.pattern).equal(colors[nextIndex]);
        });
      }
    });

    after(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });
};
