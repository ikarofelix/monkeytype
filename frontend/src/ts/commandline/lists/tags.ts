import * as DB from "../../db";
import * as EditTagsPopup from "../../popups/edit-tags-popup";
import * as ModesNotice from "../../elements/modes-notice";
import * as TagController from "../../controllers/tag-controller";
import Config from "../../config";
import * as PaceCaret from "../../test/pace-caret";
import { isAuthenticated } from "../../firebase";

const subgroup: MonkeyTypes.CommandsSubgroup = {
  title: "Change tags...",
  list: [],
  beforeList: (): void => {
    update();
  },
};

const commands: MonkeyTypes.Command[] = [
  {
    visible: false,
    id: "changeTags",
    display: "Tags...",
    icon: "fa-tag",
    subgroup,
    available: (): boolean => {
      return isAuthenticated();
    },
  },
];

function update(): void {
  const snapshot = DB.getSnapshot();
  subgroup.list = [];
  if (
    snapshot === undefined ||
    snapshot.tags === undefined ||
    snapshot.tags.length === 0
  ) {
    subgroup.list.push({
      id: "createTag",
      display: "Create tag",
      icon: "fa-plus",
      shouldFocusTestUI: false,
      exec: (): void => {
        EditTagsPopup.show("add");
      },
    });
    return;
  }
  subgroup.list.push({
    id: "clearTags",
    display: `Clear tags`,
    icon: "fa-times",
    exec: (): void => {
      const snapshot = DB.getSnapshot();
      if (!snapshot) return;

      snapshot.tags = snapshot.tags?.map((tag) => {
        tag.active = false;

        return tag;
      });

      DB.setSnapshot(snapshot);
      void ModesNotice.update();
      TagController.saveActiveToLocalStorage();
    },
  });

  for (const tag of snapshot.tags) {
    subgroup.list.push({
      id: "toggleTag" + tag._id,
      display: tag.display,
      sticky: true,
      exec: async (): Promise<void> => {
        TagController.toggle(tag._id);
        void ModesNotice.update();

        if (Config.paceCaret === "average") {
          await PaceCaret.init();
          void ModesNotice.update();
        }
      },
    });
  }
  subgroup.list.push({
    id: "createTag",
    display: "Create tag",
    icon: "fa-plus",
    shouldFocusTestUI: false,
    exec: (): void => {
      EditTagsPopup.show("add");
    },
  });
}

export default commands;
