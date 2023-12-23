import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class EmojiService {
  showMainChatEmojiPicker: boolean = false;
  showThreadEmojiPicker: boolean = false;
  showTextChatEmojiPicker: boolean = false;
  showThreadTextChatEmojiPicker: boolean = false;
  emojiString: any = "";
  messageId: any = "";
  constructor() { }

  /**
   * Adds an emoji to the main chat.
   * Updates the emojiString with the selected emoji and hides the picker.
   *
   */
  addEmojiMainChat(event: any) {
    let emojiString = event["emoji"].native;
    this.emojiString = emojiString;
    this.showMainChatEmojiPicker == false;
  }

  /**
    * Adds an emoji to the thread.
    * Updates the emojiString with the selected emoji and hides the picker.
    *
    */
  addEmojiThread($event: any) {
    let emojiString = $event["emoji"].native;
    this.emojiString = emojiString;
    this.showThreadEmojiPicker == false;
  }

  /**
     * Adds an emoji to the text chat.
     * Updates the emojiString with the selected emoji and hides the picker.
     *
     */
  addEmojiTextChat(event: any) {
    let emojiString = event["emoji"].native;
    this.emojiString = emojiString;
    this.showTextChatEmojiPicker = false;
  }
}