import * as Notifications from "../elements/notifications";
import * as TribeState from "../tribe/tribe-state";
import * as Misc from "../utils/misc";
import * as TestUI from "../test/test-ui";
import tribeSocket from "./tribe-socket";
import { InputSuggestions } from "../elements/input-suggestions";

let lastMessageTimestamp = 0;
let shouldScrollChat = true;

const lobbyChatSuggestions1 = new InputSuggestions(
  $(".pageTribe .lobby .chat .input input"),
  "@",
  "",
  3,
  0,
  "top",
  ["Enter", "Tab"]
);

const lobbyChatSuggestions2 = new InputSuggestions(
  $(".pageTribe .lobby .chat .input input"),
  ":",
  ":",
  3,
  1,
  "top",
  ["Enter", "Tab"]
);

const resultChatSuggestions1 = new InputSuggestions(
  $(".pageTest #result #tribeResultBottom .chat .input input"),
  "@",
  "",
  3,
  0,
  "top",
  ["Enter", "Tab"]
);

const resultChatSuggestions2 = new InputSuggestions(
  $(".pageTest #result #tribeResultBottom .chat .input input"),
  ":",
  ":",
  3,
  1,
  "top",
  ["Enter", "Tab"]
);

export function isAnyChatSuggestionVisible(): boolean {
  return (
    lobbyChatSuggestions1.isVisible() ||
    lobbyChatSuggestions2.isVisible() ||
    resultChatSuggestions1.isVisible() ||
    resultChatSuggestions2.isVisible()
  );
}

Misc.getEmojiList().then((emojis) => {
  const dataToSet: Record<string, TribeTypes.InputSuggestionEntry> = {};
  for (const emoji of emojis) {
    if (emoji.type === "emoji") {
      dataToSet[emoji.from] = {
        display: emoji.from,
        textIcon: emoji.to,
      };
    } else {
      dataToSet[emoji.from] = {
        display: emoji.from,
        imageIcon: emoji.to,
      };
    }
  }
  lobbyChatSuggestions2.setData(dataToSet);
  resultChatSuggestions2.setData(dataToSet);
});

export function updateSuggestionData(): void {
  const users = TribeState.getRoom()?.users;
  if (!users) return;
  const dataToSet: Record<string, TribeTypes.InputSuggestionEntry> = {};
  for (const user of Object.values(users)) {
    if (user.id === tribeSocket.getId()) continue;
    dataToSet[user.name] = {
      display: user.name,
      faIcon: "fa-user",
    };
  }
  lobbyChatSuggestions1.setData(dataToSet);
  resultChatSuggestions1.setData(dataToSet);
}

export function reset(): void {
  $(".pageTribe .lobby .chat .messages").empty();
  $(".pageTest #result #tribeResultBottom .chat .messages").empty();
  lobbyChatSuggestions1.destroy();
  lobbyChatSuggestions2.destroy();
  resultChatSuggestions1.destroy();
  resultChatSuggestions2.destroy();
}

function sendChattingUpdate(bool: boolean): void {
  tribeSocket.out.room.chattingUpdate(bool);
}

function limitChatMessages(): void {
  const messages1 = $(".pageTribe .lobby .chat .messages .message");
  const messages2 = $(
    ".pageTest #result #tribeResultBottom .chat .messages .message"
  );
  const limit = 100;

  //they should be in sync so it doesnt matter if i check one length
  if (messages1.length <= limit) return;

  const del = messages1.length - limit;

  for (let i = 0; i < del; i++) {
    $(messages1[i]).remove();
    $(messages2[i]).remove();
  }
}

export function scrollChat(): void {
  const chatEl = $(".pageTribe .lobby .chat .messages")[0];
  const chatEl2 = $(".pageTest #result #tribeResultBottom .chat .messages")[0];

  if (shouldScrollChat) {
    chatEl.scrollTop = chatEl.scrollHeight;
    chatEl2.scrollTop = chatEl2.scrollHeight;
    shouldScrollChat = true;
  }
}

export function updateIsTyping(): void {
  const room = TribeState.getRoom();
  if (!room) return;
  let string = "";

  const names: string[] = [];

  for (const userId of Object.keys(room.users)) {
    if (room.users[userId].isChatting && userId !== tribeSocket.getId()) {
      names.push(room.users[userId].name);
    }
  }
  if (names.length > 0) {
    for (let i = 0; i < names.length; i++) {
      if (i === 0) {
        string += `<span class="who">${Misc.escapeHTML(names[i])}</span>`;
      } else if (i === names.length - 1) {
        string += ` and <span class="who">${Misc.escapeHTML(names[i])}</span>`;
      } else {
        string += `, <span class="who">${Misc.escapeHTML(names[i])}</span>`;
      }
    }
    if (names.length == 1) {
      string += " is typing...";
    } else {
      string += " are typing...";
    }
  } else {
    string = " ";
  }

  $(".pageTribe .lobby .chat .whoIsTyping").html(string);
  $(".pageTest #result #tribeResultBottom .chat .whoIsTyping").html(string);
}

async function insertImageEmoji(text: string): Promise<string> {
  const textSplit = text.trim().split(" ");
  let big = "";
  if (textSplit.length === 1) big = "big";
  for (let i = 0; i < textSplit.length; i++) {
    if (/&#58;.+&#58;/g.test(textSplit[i])) {
      const emoji = await Misc.getEmojiList();
      const result = emoji.filter(
        (e) =>
          e.from.toLowerCase() ==
          textSplit[i].replace(/&#58;/g, "").toLowerCase()
      );
      if (result[0] !== undefined) {
        if (result[0].type === "image") {
          textSplit[
            i
          ] = `<div class="imageemoji ${big}" style="background-image: url('${result[0].to}')"></div>`;
        } else if (result[0].type === "emoji") {
          textSplit[i] = `<div class="emoji ${big}">${result[0].to}</div>`;
        }
      }
    }
  }
  return textSplit.join(" ");
}

export async function appendMessage(data: {
  isSystem: boolean;
  from: TribeTypes.User;
  message: string;
}): Promise<void> {
  let cls = "message";
  let author = "";
  if (data.isSystem) {
    cls = "systemMessage";
  } else {
    let me = "";
    if (data.from.id == tribeSocket.getId()) me = " me";
    author = `<div class="author ${me}">${data.from.name}:</div>`;
  }
  data.message = await insertImageEmoji(data.message);

  let previousAuthor = $(".pageTribe .lobby .chat .messages .message")
    .last()
    .find(".author")
    .text();
  previousAuthor = previousAuthor.substring(0, previousAuthor.length - 1);

  if (previousAuthor == data?.from?.name) {
    // author = author.replace(`class="author`, `class="author invisible`);
  } else {
    cls += " newAuthor";
  }

  $(".pageTribe .lobby .chat .messages").append(`
    <div class="${cls}">${author}<div class="text">${data.message}</div></div>
  `);
  $(".pageTest #result #tribeResultBottom .chat .messages").append(`
    <div class="${cls}">${author}<div class="text">${data.message}</div></div>
  `);
  limitChatMessages();
  scrollChat();
}

function sendMessage(msg: string): void {
  msg = msg.trim();
  if (msg === "") return;
  if (msg.length > 512) {
    Notifications.add("Message cannot be longer than 512 characters.", 0);
    return;
  }
  if (performance.now() < lastMessageTimestamp + 500) return;
  lastMessageTimestamp = performance.now();
  sendChattingUpdate(false);
  tribeSocket.out.room.chatMessage(msg);
  shouldScrollChat = true;
  $(".pageTribe .lobby .chat .input input").val("");
  $(".pageTest #result #tribeResultBottom .chat .input input").val("");
}

$(".pageTribe .tribePage.lobby .chat .input input").on("keyup", (e) => {
  if (e.key === "Enter") {
    if (isAnyChatSuggestionVisible()) return;
    const msg = $(".pageTribe .lobby .chat .input input").val();
    sendMessage(msg as string);
  }
});

$(".pageTest #result #tribeResultBottom .chat .input input").on(
  "keyup",
  (e) => {
    if (e.key === "Enter") {
      if (isAnyChatSuggestionVisible()) return;
      const msg = $(
        ".pageTest #result #tribeResultBottom .chat .input input"
      ).val();
      sendMessage(msg as string);
    }
  }
);

$(document).keydown((e) => {
  if (TribeState.getState() === 5) {
    if (
      e.key === "/" &&
      !$(".pageTribe .lobby .chat .input input").is(":focus")
    ) {
      $(".pageTribe .lobby .chat .input input").focus();
      e.preventDefault();
    }
  } else if (TestUI.resultVisible && TribeState.getState() >= 20) {
    if (
      e.key === "/" &&
      !$(".pageTest #result #tribeResultBottom .chat .input input").is(":focus")
    ) {
      $(".pageTest #result #tribeResultBottom .chat .input input").focus();
      e.preventDefault();
    }
  }
});

$(".pageTribe .tribePage.lobby .chat .input input").on("input", (_e) => {
  const val = $(
    ".pageTribe .tribePage.lobby .chat .input input"
  ).val() as string;
  $(".pageTest #result #tribeResultBottom .chat .input input").val(val);
  const vallen = val.length;
  if (vallen === 1) {
    sendChattingUpdate(true);
  } else if (vallen === 0) {
    sendChattingUpdate(false);
  }
});

$(".pageTest #result #tribeResultBottom .chat .input input").on(
  "input",
  (_e) => {
    const val = $(
      ".pageTest #result #tribeResultBottom .chat .input input"
    ).val() as string;
    $(".pageTribe .tribePage.lobby .chat .input input").val(val);
    const vallen = val.length;
    if (vallen === 1) {
      sendChattingUpdate(true);
    } else if (vallen === 0) {
      sendChattingUpdate(false);
    }
  }
);

$(".pageTribe .lobby .chat .messages").on("scroll", (_e) => {
  const el = $(".pageTribe .lobby .chat .messages")[0];
  const scrollHeight = el.scrollHeight as number;
  const scrollTop = el.scrollTop as number;
  const height = el.clientHeight as number;
  if (height + scrollTop < scrollHeight - 20) {
    shouldScrollChat = false;
  } else {
    shouldScrollChat = true;
  }
});

$(".pageTest #result #tribeResultBottom .chat .messages").on("scroll", (_e) => {
  const el = $(".pageTest #result #tribeResultBottom .chat .messages")[0];
  const scrollHeight = el.scrollHeight as number;
  const scrollTop = el.scrollTop as number;
  const height = el.clientHeight as number;
  if (height + scrollTop < scrollHeight - 20) {
    shouldScrollChat = false;
  } else {
    shouldScrollChat = true;
  }
});
