import { Component, EventEmitter, Output, OnInit, inject, ViewChild, ElementRef, HostListener } from '@angular/core';
import { ThreadService } from '../services/thread.service';
import { MatDialog } from '@angular/material/dialog';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { ChatService } from '../services/chat.service';
import { Firestore, collection, doc, updateDoc } from '@angular/fire/firestore';
import { Channel } from 'src/models/channel.class';
import { Reaction } from 'src/models/reaction.class';
import { Message } from 'src/models/message.class';
import { EmojiService } from '../services/emoji.service';
import { FirestoreService } from '../services/firestore.service';
import { User } from 'src/models/user.class';
import { DialogViewProfileComponent } from '../dialog-view-profile/dialog-view-profile.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-thread',
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss', './thread.component.mediaquery.scss']
})

export class ThreadComponent implements OnInit {
  threadContent = "";
  firestore: Firestore = inject(Firestore);
  currentChat!: Channel | undefined;
  message: Message = new Message();
  reaction: Reaction = new Reaction;
  threadMessagesByDate: { [date: string]: Message[] } = {};
  sortedThreadMessages: { date: string, messages: Message[] }[] = []
  allReactionsByMessage: [] = [];
  currentMessage: any = [];
  showUploadedFile = false;
  taggedNames = "";
  unSubReactions: any;
  currentUser: User;
  currentThread: [] = [];
  toggled: boolean = false;
  @ViewChild('editorThread') editorThread!: ElementRef;
  @Output() closeThread: EventEmitter<void> = new EventEmitter<void>();
  edit: boolean = false;
  editingThreadMessage: string | undefined;
  scrollPosition: any;
  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLDivElement>;

  constructor(public threadService: ThreadService, public dialog: MatDialog, public userService: UserService,
    public authService: AuthService, public chatService: ChatService, public emojiService: EmojiService, 
    public firestoreService: FirestoreService, public router: Router) {
    userService.getCurrentUserFromLocalStorage();
    this.currentUser = this.userService.currentUser;
    chatService.checkScreenWidth();
  }

  ngOnInit() {
    this.threadService.openMessage$.subscribe((openMessage) => {
      if (openMessage) {
        this.loadCurrentThread(openMessage);
      } else {
        this.loadThreadFromLocalStorage();
      }
    });
    this.firestoreService.messageAddedInThread.subscribe(() => {
      this.scrollToBottom();
    });
  }

  /**
   * Sets the current thread based on the provided openMessage.
   * @param {any} openMessage - The open message to extract thread information from.
   */
  loadCurrentThread(openMessage: any) {
    const message = openMessage as Message;
    if (this.chatService.isMobile) {
      this.userService.setCurrentChatToLocalStorage(message);
    }
    if (!this.currentMessage || this.currentMessage.id !== message.id) {
     this.loadThread(message)
    }
  }

  /**
   * Loads the thread based on the provided message.
   * @param {Message} message - The message containing information to load the thread.
   */
  loadThread(message: Message) {
    this.currentMessage = message;
    this.threadService.currentMessage = message;
    if (this.firestoreService.unSubThread) {
      this.firestoreService.unSubThread();
    }
    this.firestoreService.loadThread(this.currentMessage.id);
  }

  /**
   * Loads the thread data from local storage and sets the current message and thread in the respective services: Used for reload of page
   */
  loadThreadFromLocalStorage() {
    this.currentMessage = this.userService.getCurrentChatFromLocalStorage();
    this.threadService.currentMessage = this.currentMessage;
    this.firestoreService.loadThread(this.currentMessage.id);
    if (this.currentMessage.type = 'direct') {
      this.threadService.isThreadInDM = true;
    }

   
  }
  
  ngOnDestroy() {
    if (this.firestoreService.unSubThread) {
      this.firestoreService.unSubThread(); // Bestehendes Abonnement kündigen
    }
  }

  /**
   * Adds a message to the thread associated with the current message.
   */
  async addMessageToThread() {
    if (this.currentMessage.id && this.message.content?.trim() !== '' || this.showUploadedFile) {
      this.message.content = this.message.content!.replace(this.taggedNames, '');
      this.setThreadValues();
      await this.threadService.sendMessageInThread(this.currentMessage, this.message);
      this.threadService.updateThreadCount(this.currentMessage, this.message.time);
      this.message = new Message();
      this.firestoreService.messageAddedInThread.emit();
    }
    this.scrollToBottom();
    this.showUploadedFile = false;
    this.taggedNames ="";
  }

  /**
   * Sets values for the current thread message, such as content, timestamp, creator information, and profile picture.
   */
  setThreadValues() {
    this.getSentMessageTime();
    this.getSentMessageDate();
    this.message.creator = this.userService.currentUser.name;
    this.message.profilePic = this.userService.currentUser.picture;
    this.message.creatorId = this.userService.currentUser.id;
    this.message.channelID = this.currentMessage.id;
  }
  
  /**
   * Scrolls the chat window to the bottom, showing the most recent messages.
   */
  scrollToBottom(): void {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  /**
   * Opens the emoji picker for adding emojis to a thread message.
   * @param {any} messageId - The ID of the message.
   */
  openEmojiPicker(messageId: any) {
    setTimeout(() => {
      this.emojiService.showThreadEmojiPicker = true;
    }, 1);
    this.emojiService.messageId = messageId;
  }

  /**
   * Generates a string with tagged user name and adds it to the message content.
   * @param {any} user - The user to be tagged.
   */
  getUserNameString(user: any) {
    let taggedName: any;
    taggedName = `@${user.name}`;
    this.taggedNames +=  `@${user.name}`;
    this.message.content += taggedName!;
    this.message.mentions.push(user);
    this.userService.openUserContainerTextfield.next(false);
  }

  /**
   * Opens the emoji picker for the chat input field in a thread.
   */
  openEmojiPickerChat() {
    setTimeout(() => {
      this.emojiService.showThreadTextChatEmojiPicker = true;
    }, 1);
  }

  /**
   * Closes the emoji picker if it's open and no emoji has been selected.
   */
  closeEmojiPicker() {
    if (this.emojiService.showThreadEmojiPicker == true  || this.emojiService.showThreadTextChatEmojiPicker == true &&  this.emojiService.emojiString == "") {
      this.emojiService.showThreadEmojiPicker = false;
      this.emojiService.showThreadTextChatEmojiPicker = false;
    }
    this.userService.openUserContainerThreadTextfield.next(false);
  }

  /**
   * Adds an emoji to a thread message.
   * @param {any} $event - The emoji select event.
   */
  addEmoji($event: any) {
    this.emojiService.addEmojiThread($event);
    this.firestoreService.addReaction(this.emojiService.emojiString, this.emojiService.messageId, this.currentMessage.id, 'threads');
    this.emojiService.showThreadEmojiPicker = false;
    this.emojiService.emojiString = "";
  }

  /**
   * Adds an emoji to the chat input field in a thread.
   * @param {any} $event - The emoji select event.
   */
  addEmojiTextField($event: any) {
    this.emojiService.addEmojiTextChat($event);
    this.message.content += this.emojiService.emojiString;
    this.emojiService.showThreadTextChatEmojiPicker = false;
      this.emojiService.emojiString = "";
  }

  /**
   * Sets the date for a sent message in the thread.
   */
  getSentMessageDate() {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString();
    this.message.date = formattedDate;
  }

  /**
   * Sets the time for a sent message in the thread.
   */
  getSentMessageTime() {
    const currentTime = new Date();
    this.message.timeInMs = currentTime.getTime();
    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.message.time = formattedTime;
  }

  /**
   * Updates the message ID in the database.
   * @param {string} colId - The collection ID.
   * @param {Message} message - The message to update.
   * @param {string} newId - The new message ID.
   */
  async updateMessageId(colId: string, message: Message, newId: string) {
    message.id = newId;
    await this.updateChannel(colId, message);
  }

  /**
   * Updates the message data in the Firestore database.
   * @param {string} colId - The collection ID.
   * @param {Message} message - The message to update.
   */
  async updateChannel(colId: string, message: Message) {
    const docRef = doc(collection(this.firestore, colId), message.id);
    await updateDoc(docRef, this.getUpdateData(message)).catch(
      (error) => { console.log(error); }
    );
  }

  /**
   * Opens the profile view dialog for a specific user.
   * @param {any} id - The ID of the user.
   */
  openProfileDialog(id: any): void {
    this.dialog.open(DialogViewProfileComponent, {
      panelClass: 'dialog-container',
      data: { userID: id },
    });
  }

  /**
   * Gets the data to be updated in the Firestore document.
   * @param {Message} message - The message to be updated.
   * @returns {Object} The data to update.
   */
  getUpdateData(message: Message) {
    return {
      creator: this.userService.currentUser.name,
      creatorId: this.userService.currentUser.id,
      content: message.content,
      time: message.time,
      date: message.date,
      id: message.id,
      profilePic: this.userService.currentUser.picture,
      reaction: [],
      reactionCount: message.reactionCount,
    };
  }

  /**
   * Emits an event to close the thread view.
   */
  onCloseClick() {
    if (this.chatService.isMobile) {
      this.router.navigate(['home'])
    } else {
      this.chatService.closeThread();
    }
  }

  /**
   * Enables editing mode for a specific message in the thread.
   * @param {Message} message - The message to be edited.
   */
  editThreadMessage(message: Message) {
    if (this.currentMessage) {
      if (message.creator == this.currentUser.name) {
        this.edit = true;
        this.editingThreadMessage = message.id;
        this.firestoreService.toggleMoreMenu(message);
      }
    }
  }

  /**
   * Handles file selection for uploading images or other files.
   * @param {any} event - The file input event.
   */
  onFileSelected(event: any): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 500000) {
        alert("Max file size 500kb !");
      } else {
        this.authService.uploadProfileImage(file);
        this.firestoreService.showSpinner = true;
      }
      this.resetStatus()
      event.target.value = '';
    }
  }

  /**
   * Resets status of spinner and uploaded file and pushes uploaded pic in array
   */
  resetStatus() {
    setTimeout(() => {
      this.message.files.push(this.authService.customPic);
      this.firestoreService.showSpinner = false;
    }, 3000);
    this.showUploadedFile = true;
  }

  /**
   * Updates the content of a message in the thread.
   * @param {Message} message - The message to be updated.
   */
  async updateMessageContent(message: Message) {
    let messageId = message.id
    const messageColRef = doc(collection(this.firestore, `threads/${this.currentMessage?.id}/messages/`), messageId);
    await updateDoc(messageColRef, this.setMessageValues()).catch((error) => {
      console.error('Error updating document:', error);
    });
    this.edit = false;
  }

  /**
   * Sets the values for updating a message.
   * @returns {Object} The data to update in a message.
   */
  setMessageValues() {
    return {
      content: this.editorThread.nativeElement.value
    }
  }
}
