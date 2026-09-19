/**
 * @file Inventory-row context menu wired from the V2 actor sheet's `_onRender`.
 */
const { ContextMenu } = foundry.applications.ux;

const equippableTypes = new Set(["item", "armor", "weapon", "treasure", "container"]);

export default function bindItemContextMenu(sheet) {
  if (!sheet.actor?.isOwnerOrObserver) return;

  const itemFrom = (element) => sheet.actor?.items?.get(element?.dataset?.itemId);

  new ContextMenu.implementation(
    sheet.element,
    ".item-entry",
    [
      {
        name: "OSE.Show",
        icon: "<i class='fas fa-eye'></i>",
        callback: (element) => itemFrom(element)?.show(),
      },
      {
        name: "OSE.items.Equip",
        icon: "<i class='fas fa-hand'></i>",
        condition: (element) =>
          sheet.actor?.type === "character" && sheet.isEditable && equippableTypes.has(itemFrom(element)?.type),
        callback: (element) => {
          const item = itemFrom(element);
          return item?.update({ system: { equipped: !item.system.equipped } });
        },
      },
      {
        name: "OSE.Edit",
        icon: "<i class='fas fa-edit'></i>",
        condition: () => sheet.isEditable,
        callback: (element) => itemFrom(element)?.sheet?.render({ force: true }),
      },
      {
        name: "OSE.Delete",
        icon: "<i class='fas fa-trash'></i>",
        condition: () => sheet.isEditable,
        callback: (element) => {
          const item = itemFrom(element);
          if (item) sheet._promptRemoveItemFromActor(item);
        },
      },
    ],
    { jQuery: false },
  );
}
