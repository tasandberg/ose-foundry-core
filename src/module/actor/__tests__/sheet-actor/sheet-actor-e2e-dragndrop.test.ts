/**
 * @file Contains tests for dragging and dropping items to and from Actor Sheet.
 */
import type { QuenchMethods } from "../../../../e2e";
import {
  cleanUpActorsByKey,
  cleanUpCompendium,
  cleanUpWorldItems,
  closeSheets,
  createActorTestItem,
  createMockActorKey,
  createMockCompendium,
  createWorldTestItem,
  itemTypes,
  waitFor,
  waitForElement,
} from "../../../../e2e/testUtils";

export const key = "ose.actor.sheet.e2e.dragndrop";
export const options = {
  displayName: "OSE: Actor: Sheet E2E Drag'n'Drop",
  preSelected: true,
};

type TestContext = { timeout: (ms: number) => void };

type SheetUnderTest = {
  element: HTMLElement;
  render: (options: object) => Promise<unknown>;
  changeTab: (tab: string, group: string) => void;
};

const renderSheet = async (actor: { sheet: SheetUnderTest }): Promise<HTMLElement> => {
  await actor.sheet.render({ force: true });
  return actor.sheet.element;
};

const executeDrag = (sourceElement: Element | null) => {
  const dragStartEvent = new DragEvent("dragstart", {
    dataTransfer: new DataTransfer(),
    bubbles: true,
    cancelable: true,
  });
  sourceElement?.dispatchEvent(dragStartEvent);
  return dragStartEvent;
};

const executeDragNDrop = (sourceElement: Element | null, targetElement: Element | null) => {
  const dragStartEvent = executeDrag(sourceElement);
  targetElement?.dispatchEvent(
    new DragEvent("drop", {
      dataTransfer: dragStartEvent.dataTransfer,
      bubbles: true,
      cancelable: true,
    }),
  );
};

const itemRow = (itemId: string) => `.inventory li.item[data-item-id="${itemId}"]`;

export default ({ describe, it, expect, after, afterEach }: QuenchMethods) => {
  describe("_onDragStart(event)", () => {
    it("populates dataTransfer with the dropped document reference", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      expect(actor).not.undefined;

      const root = await renderSheet(actor);
      const [item] = await createActorTestItem(actor, "weapon");
      const itemElement = await waitForElement(itemRow(item.id), { root });
      expect(itemElement).not.null;

      const event = executeDrag(itemElement);
      const parsedData = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);

      expect(Object.keys(parsedData)).contain("type");
      expect(Object.keys(parsedData)).contain("uuid");
      expect(parsedData.type).equal("Item");
      expect(parsedData.uuid).equal(item.uuid);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onDropItem(event, item)", () => {
    it("creates a world item on the actor when it is dropped outside a container", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const root = await renderSheet(actor);
      const worldItem = await createWorldTestItem("weapon");

      const created = await actor?.sheet?._onDropItem(
        { target: root, preventDefault: () => {}, dataTransfer: new DataTransfer() },
        worldItem,
      );

      expect(created).not.null;
      expect(created.name).equal(worldItem?.name);
      expect(actor?.items.getName(worldItem?.name)).not.undefined;
    });

    it("returns null when an item is dropped onto itself", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [item] = await createActorTestItem(actor, "weapon");
      const root = await renderSheet(actor);

      const itemElement = await waitForElement(itemRow(item.id), { root });
      const dropped = await actor?.sheet?._onDropItem(
        { target: itemElement, preventDefault: () => {}, dataTransfer: new DataTransfer() },
        item,
      );

      expect(dropped).is.null;
      expect(actor?.items.size).equal(1);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await cleanUpWorldItems();
      await closeSheets();
    });
  });

  describe("_onSortItem(event, item)", () => {
    it("dropping an item onto a sibling reorders it", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [first] = await createActorTestItem(actor, "weapon", "First Weapon");
      const [second] = await createActorTestItem(actor, "weapon", "Second Weapon");
      const root = await renderSheet(actor);

      const firstElement = await waitForElement(itemRow(first.id), { root });
      const secondElement = await waitForElement(itemRow(second.id), { root });
      expect(firstElement).not.null;
      expect(secondElement).not.null;

      executeDragNDrop(firstElement, secondElement);
      await waitFor(() => first.sort > second.sort);

      expect(first.sort).is.greaterThan(second.sort);
    });

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await closeSheets();
    });
  });

  describe("_onDropItem(event, item) - Containers", () => {
    const sanityChecks = (
      actor: unknown,
      compendium: unknown,
      container: unknown,
      containerElement: Element | null,
    ) => {
      const owner = actor as { documentName: string };
      const pack = compendium as { documentName: string };
      const target = container as { documentName: string; name: string };

      expect(owner).not.undefined;
      expect(owner.documentName).equal("Actor");
      expect(pack).not.undefined;
      expect(pack.documentName).equal("Item");
      expect(target).not.undefined;
      expect(target.documentName).equal("Item");
      expect(target.name).equal("TargetContainer");
      expect(containerElement).not.null;
      expect(containerElement?.constructor.name).equal("HTMLLIElement");
    };

    const preflightCheck = (sourceItemName: string, source: unknown, container: unknown) => {
      const sourceItem = source as { documentName: string; name: string; system: { containerId: string } };
      const target = container as { system: { itemIds: string[] } };

      expect(sourceItem).not.undefined;
      expect(sourceItem.documentName).equal("Item");
      expect(sourceItem.name).equal(sourceItemName);
      expect(sourceItem.system.containerId).equal("");
      expect(target.system.itemIds.length).equal(0);
    };

    const postflightCheck = (actor: unknown, source: unknown, container: unknown) => {
      const owner = actor as { system: Record<string, unknown[]> };
      const sourceItem = source as { id: string; type: string; system: { containerId: string } };
      const target = container as { id: string; system: { itemIds: string[] } };

      expect(target.system.itemIds.length).equal(1);
      expect(target.system.itemIds).contain(sourceItem.id);
      expect(sourceItem.system.containerId).equal(target.id);

      const getter = sourceItem.type === "armor" ? sourceItem.type : `${sourceItem.type}s`;
      expect(owner.system[getter]?.length).equal(getter === "containers" ? 1 : 0);
    };

    const setUpSheetAndCompendium = async () => {
      await cleanUpActorsByKey(key);
      await cleanUpCompendium();
      await cleanUpWorldItems();

      const actor = await createMockActorKey("character", {}, key);
      const compendium = await createMockCompendium("Item");
      const [container] = await createActorTestItem(actor, "container", "TargetContainer");

      const root = await renderSheet(actor);
      compendium?.render(true);
      actor.sheet.changeTab("inventory", "primary");

      const containerElement = await waitForElement(itemRow(container.id), { root });
      return { actor, compendium, container, root, containerElement };
    };

    it("Issue#357 Dragging container onto itself should retain container in inventory", async function (this: TestContext) {
      this.timeout(5000);
      const actor = await createMockActorKey("character", {}, key);
      const [container] = await createActorTestItem(actor, "container", "TargetContainer");
      const [weapon] = await createActorTestItem(actor, "weapon");
      const root = await renderSheet(actor);

      const weaponElement = await waitForElement(itemRow(weapon.id), { root });
      const containerElement = await waitForElement(itemRow(container.id), { root });

      preflightCheck("New Actor Test Weapon", weapon, container);
      executeDragNDrop(weaponElement, containerElement);
      await waitFor(() => container.system.itemIds.length === 1);

      expect(container.system.itemIds.length).equal(1);
      expect(container.system.itemIds).contain(weapon.id);
      expect(weapon.system.containerId).equal(container.id);

      const refreshedContainer = await waitForElement(itemRow(container.id), { root });
      executeDragNDrop(refreshedContainer, refreshedContainer);
      await waitFor(() => !!actor?.items.get(container.id));

      expect(await waitForElement(itemRow(container.id), { root })).not.null;
    });

    for (const itemType of itemTypes) {
      if (itemType === "spell" || itemType === "ability") continue;

      describe(`manipulating ${itemType} item type`, () => {
        it(`drag ${itemType} from actor sheet into a container in a character sheet`, async function (this: TestContext) {
          this.timeout(5000);
          const { actor, compendium, container, root, containerElement } = await setUpSheetAndCompendium();
          sanityChecks(actor, compendium, container, containerElement);

          const [source] = await createActorTestItem(actor, itemType);
          const sourceElement = await waitForElement(itemRow(source.id), { root });
          const dropTarget = await waitForElement(itemRow(container.id), { root });

          preflightCheck(source.name, source, container);
          executeDragNDrop(sourceElement, dropTarget);
          await waitFor(() => container.system.itemIds.length === 1);

          postflightCheck(actor, source, container);
        });

        it(`drag ${itemType} from item sidebar into a container in a character sheet`, async function (this: TestContext) {
          this.timeout(5000);
          const { actor, compendium, container, root, containerElement } = await setUpSheetAndCompendium();
          sanityChecks(actor, compendium, container, containerElement);

          const worldItem = await createWorldTestItem(itemType);
          const sourceElement = await waitForElement(`#items li.item[data-entry-id="${worldItem?.id}"]`);
          const dropTarget = await waitForElement(itemRow(container.id), { root });

          preflightCheck(worldItem?.name, worldItem, container);
          executeDragNDrop(sourceElement, dropTarget);
          await waitFor(() => container.system.itemIds.length === 1);

          postflightCheck(actor, actor?.items.getName(worldItem?.name), container);
        });

        it(`drag ${itemType} from compendium into a container in a character sheet`, async function (this: TestContext) {
          this.timeout(5000);
          const { actor, compendium, container, root, containerElement } = await setUpSheetAndCompendium();
          sanityChecks(actor, compendium, container, containerElement);

          const worldItem = await createWorldTestItem(itemType);
          const packItem = await compendium?.importDocument(worldItem);
          const sourceElement = await waitForElement(`.compendium-directory li.item[data-entry-id="${packItem?.id}"]`);
          const dropTarget = await waitForElement(itemRow(container.id), { root });

          preflightCheck(packItem?.name, packItem, container);
          executeDragNDrop(sourceElement, dropTarget);
          await waitFor(() => container.system.itemIds.length === 1);

          postflightCheck(actor, actor?.items.getName(packItem?.name), container);
        });
      });
    }

    afterEach(async () => {
      await cleanUpActorsByKey(key);
      await cleanUpCompendium();
      await cleanUpWorldItems();
      await closeSheets();
    });
  });

  after(async () => {
    await cleanUpActorsByKey(key);
    await cleanUpCompendium();
    await cleanUpWorldItems();
    await closeSheets();
  });
};
