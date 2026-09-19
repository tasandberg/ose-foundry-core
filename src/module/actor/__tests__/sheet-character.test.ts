/**
 * @file Contains tests for Character Sheet.
 */
import type { QuenchMethods } from "../../../e2e";
import {
  cleanUpActorsByKey,
  closeSheets,
  closeV2Dialogs,
  createActorTestItem,
  createMockActorKey,
  openV2AppsByClass,
  openV2Dialogs,
  trashChat,
  waitFor,
  waitForElement,
} from "../../../e2e/testUtils";
import OseActorSheetCharacter from "../character-sheet";

export const key = "ose.actor.sheet.character";
export const options = { displayName: "OSE: Actor: Sheet: Character" };

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

const baselineScores = {
  str: { value: 10 },
  dex: { value: 10 },
  int: { value: 10 },
  con: { value: 10 },
  wis: { value: 10 },
  cha: { value: 10 },
};

export default ({ describe, it, expect, assert, after, afterEach }: QuenchMethods) => {
  after(async () => {
    await cleanUpActorsByKey(key);
    await closeSheets();
  });

  describe("DEFAULT_OPTIONS", () => {
    it("Has correctly set defaults", () => {
      const opts = OseActorSheetCharacter.DEFAULT_OPTIONS;
      expect(opts.classes).contain("ose");
      expect(opts.classes).contain("sheet");
      expect(opts.classes).contain("actor");
      expect(opts.classes).contain("character");
      expect(opts.position.width).equal(450);
      expect(opts.position.height).equal(530);
    });

    it("Registers the character sheet actions", () => {
      const actions = Object.keys(OseActorSheetCharacter.DEFAULT_OPTIONS.actions);
      expect(actions).contain("generateScores");
      expect(actions).contain("popLang");
      expect(actions).contain("pushLang");
      expect(actions).contain("rollExploration");
      expect(actions).contain("rollScore");
      expect(actions).contain("showGpCost");
      expect(actions).contain("showModifiers");
      expect(actions).contain("toggleEquipped");
    });
  });

  describe("PARTS", () => {
    it("Declares one template part per tab", () => {
      const { PARTS } = OseActorSheetCharacter;
      expect(PARTS.header.template).contain("/templates/actors/partials/character-header.html");
      expect(PARTS.tabnav.template).contain("/templates/actors/partials/sheet-tabs.html");
      expect(PARTS.attributes.template).contain("/templates/actors/partials/character-attributes-tab.html");
      expect(PARTS.abilities.template).contain("/templates/actors/partials/character-abilities-tab.html");
      expect(PARTS.spells.template).contain("/templates/actors/partials/character-spells-tab.html");
      expect(PARTS.inventory.template).contain("/templates/actors/partials/character-inventory-tab.html");
      expect(PARTS.notes.template).contain("/templates/actors/partials/character-notes-tab.html");
      expect(PARTS.spells.scrollable).contain(".inventory");
      expect(PARTS.inventory.scrollable).contain(".inventory");
    });
  });

  describe("TABS", () => {
    it("Opens on the attributes tab", () => {
      const { primary } = OseActorSheetCharacter.TABS;
      expect(primary.initial).equal("attributes");
      expect(primary.tabs.map((tab: { id: string }) => tab.id)).to.eql([
        "attributes",
        "abilities",
        "spells",
        "inventory",
        "notes",
      ]);
    });
  });

  describe("_isTabEnabled(tabId)", () => {
    it("Hides the spells tab until spellcasting is enabled", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const sheet = actor?.sheet;

      assert(sheet._isTabEnabled("notes"));
      assert(sheet._isTabEnabled("attributes"));
      assert(!sheet._isTabEnabled("spells"));

      await actor?.update({ system: { spells: { enabled: true } } });
      assert(sheet._isTabEnabled("spells"));

      await actor?.delete();
    });

    it("Drops the disabled tab from the rendered parts", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const root = await renderSheet(actor);

      expect(root.querySelector(`.tab[data-tab="spells"]`)).is.null;
      expect(root.querySelector(`.tab[data-tab="attributes"]`)).is.not.null;

      await actor?.update({ system: { spells: { enabled: true } } });
      await waitForElement(`.tab[data-tab="spells"]`, { root });
      expect(root.querySelector(`.tab[data-tab="spells"]`)).is.not.null;
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("generateScores()", () => {
    const scores = { str: 0, int: 0, dex: 0, wis: 0, con: 0, cha: 0 };

    const openCreator = async (actor: { sheet: { generateScores: () => void } }) => {
      actor.sheet.generateScores();
      await waitForElement("#character-creator");
      const creators = openV2AppsByClass("creator");
      expect(creators.length).equal(1);
      return creators[0];
    };

    const rollScore = async (score: string) => {
      click(document.querySelector(`.creator div[data-score="${score}"] a[data-action="rollScore"]`));
      await waitFor(() => {
        const input = document.querySelector<HTMLInputElement>(`.creator div[data-score="${score}"] input.score-value`);
        return Number.parseInt(input?.value ?? "0", 10) > 0;
      });
      const input = document.querySelector<HTMLInputElement>(`.creator div[data-score="${score}"] input.score-value`);
      return Number.parseInt(input?.value ?? "0", 10);
    };

    it("renders the character creator", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const creator = await openCreator(actor);
      await creator?.close();
    });

    it("clicking on the dices generates scores", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const creator = await openCreator(actor);

      for (const score of Object.keys(scores)) {
        expect(await rollScore(score)).is.greaterThan(0);
      }

      await creator?.close();
    });

    it("saving scores records data to actor", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      await openCreator(actor);

      for (const score of Object.keys(scores)) {
        scores[score as keyof typeof scores] = await rollScore(score);
      }

      document.querySelector<HTMLFormElement>(".creator")?.requestSubmit();
      await waitFor(() => actor?.system.scores.str.value === scores.str);

      expect(actor?.system.scores.str.value).equal(scores.str);
      expect(actor?.system.scores.dex.value).equal(scores.dex);
      expect(actor?.system.scores.wis.value).equal(scores.wis);
      expect(actor?.system.scores.int.value).equal(scores.int);
      expect(actor?.system.scores.con.value).equal(scores.con);
      expect(actor?.system.scores.cha.value).equal(scores.cha);
    });

    afterEach(async () => {
      await trashChat();
      await closeV2Dialogs();
      await cleanUpActorsByKey(key);
    });
  });

  describe("_prepareContext(options)", () => {
    it("returns the expected data", async () => {
      const actor = await createMockActorKey("character", {}, key);
      const data = await actor?.sheet?._prepareContext({});

      expect(Object.keys(data)).contain("enrichedBiography");
      expect(Object.keys(data)).contain("enrichedNotes");
      expect(Object.keys(data)).contain("owned");
      expect(Object.keys(data.owned)).contain("weapons");
      expect(Object.keys(data.owned)).contain("items");
      expect(Object.keys(data.owned)).contain("containers");
      expect(Object.keys(data.owned)).contain("armors");
      expect(Object.keys(data.owned)).contain("treasures");
      expect(Object.keys(data)).contain("containers");
      expect(Object.keys(data)).contain("abilities");
      expect(Object.keys(data)).contain("spells");
      expect(Object.keys(data)).contain("slots");
      expect(Object.keys(data)).contain("system");
      expect(Object.keys(data.system)).contain("usesAscendingAC");
      expect(Object.keys(data.system)).contain("meleeMod");
      expect(Object.keys(data.system)).contain("rangedMod");
      expect(Object.keys(data.system)).contain("init");

      await actor?.delete();
    });
  });

  describe("_chooseLang()", () => {
    it("renders a dialog", async () => {
      const actor = await createMockActorKey("character", {}, key);
      actor?.sheet?._chooseLang();
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

  describe("_pushLang(table)", () => {
    const table = "languages";

    it("renders a dialog", async () => {
      const actor = await createMockActorKey("character", {}, key);
      actor?.sheet?._pushLang(table);
      await waitFor(() => openV2Dialogs().length === 1);

      const dialogs = openV2Dialogs();
      expect(dialogs.length).equal(1);
      await dialogs[0]?.close();
    });

    it("adds language on OK", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      actor?.sheet?._pushLang(table);
      await waitFor(() => openV2Dialogs().length === 1);

      const dialog = openV2Dialogs()[0];
      click(dialog?.element.querySelector(`button[data-action="ok"]`));
      await waitFor(() => actor?.system.languages.value.length === 1);

      expect(openV2Dialogs().length).equal(0);
      expect(actor?.system.languages.value.length).equal(1);
      expect(actor?.system.languages.value[0]).equal("Common");
    });

    afterEach(async () => {
      await closeV2Dialogs();
      await cleanUpActorsByKey(key);
    });
  });

  describe("_popLang(table, lang)", () => {
    const table = "languages";

    it("can remove added language", async () => {
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ "system.languages.value": ["Common"] });

      expect(actor?.system.languages.value.length).equal(1);
      expect(actor?.system.languages.value[0]).equal("Common");

      await actor?.sheet?._popLang(table, "Common");
      expect(actor?.system.languages.value.length).equal(0);

      await actor?.delete();
    });
  });

  describe("_onShowModifiers(event)", () => {
    it("renders a dialog", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { scores: baselineScores } });
      const root = await renderSheet(actor);

      const control = await waitForElement(`.profile a[data-action="showModifiers"]`, { root });
      expect(control).is.not.null;

      click(control);
      await waitFor(() => openV2AppsByClass("modifiers").length === 1);
      expect(openV2AppsByClass("modifiers").length).equal(1);
    });

    afterEach(async () => {
      await closeV2Dialogs();
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onShowGpCost(event)", () => {
    it("renders a dialog", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      await actor?.update({ system: { scores: baselineScores } });
      const root = await renderSheet(actor);

      const control = await waitForElement(`.profile a[data-action="showGpCost"]`, { root });
      expect(control).is.not.null;

      click(control);
      await waitFor(() => openV2AppsByClass("gp-cost").length === 1);
      expect(openV2AppsByClass("gp-cost").length).equal(1);
    });

    afterEach(async () => {
      await closeV2Dialogs();
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onToggleEquipped(event, target)", () => {
    it("toggles the equipped flag of an inventory item", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [weapon] = await createActorTestItem(actor, "weapon");
      const root = await renderSheet(actor);

      const selector = `.item-entry[data-item-id="${weapon.id}"] a[data-action="toggleEquipped"]`;
      await waitForElement(selector, { root });
      expect(weapon.system.equipped).is.false;

      click(root.querySelector(selector));
      await waitFor(() => weapon.system.equipped === true);
      expect(weapon.system.equipped).is.true;
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });
};
