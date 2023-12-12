import { EventEmitter, Injectable, inject } from '@angular/core';
import { DocumentData, DocumentReference, Firestore, addDoc, collection, doc, getDoc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc } from '@angular/fire/firestore';
import { Message } from 'src/models/message.class';
import { ThreadService } from './thread.service';
import { UserService } from './user.service';
import { Channel } from 'src/models/channel.class';
import { Thread } from 'src/models/thread.class';
import { AuthService } from './auth.service';
import { User } from 'src/models/user.class';
import { deleteDoc, limit } from 'firebase/firestore';
import { ChatService } from './chat.service';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  firestore: Firestore = inject(Firestore);
  unSubChannelMessages: any;
  allMessagesOfChannel: Message[] = [];
  messagesByDate: { [date: string]: Message[] } = {};
  organizedDirectMessages: { date: string, messages: Message[] }[] = []
  organizedChannelMessages: { date: string, messages: Message[] }[] = []
  allChannelMembers: any[] = [];
  firstThreeItems: any[] = [];
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  searchInput: string = '';
  showSpinner = false;
  showThreadSpinner = false;
  messageAdded = new EventEmitter<void>();

  // ----Thread----
  allThreadMessages: Message[] = [];
  unSubThread: any;
  constructor(public threadService: ThreadService, public chatService: ChatService, public userService: UserService, public authService: AuthService) { }

  // ----- Direct Messages --------------
  unSubDirectMessages: any;
  allDirectMessages: Message[] = [];
  messageIsExisting!: boolean;

  // ------------------ channel ----------------------------------------------------------
  async addChannel(channel: Channel) {
    await addDoc(collection(this.firestore, 'channels'), channel.toJSON())
      .catch((err) => {
        console.log(err);
      })
      .then((docRef: void | DocumentReference<DocumentData, DocumentData>) => {
        if (docRef && docRef instanceof DocumentReference) {
          this.updateChannelId('channels', channel, docRef.id);
        }
      });
  }

  async updateChannelId(colId: string, channel: Channel, newId: string) {
    channel.id = newId;
    await this.updateChannel(colId, channel);
  }

  async updateChannel(colId: string, channel: Channel) {
    const docRef = doc(collection(this.firestore, colId), channel.id);
    await updateDoc(docRef, this.getUpdateData(channel)).catch(
      (error) => { console.log(error); }
    );
  }

  getUpdateData(channel: Channel) {
    return {
      name: channel.name, description: channel.description, creator: channel.creator, id: channel.id,
    };
  }

  loadChannelMessages(currentChat: any) {
    if (currentChat.id) {
      console.log('firestore', currentChat);
      const messageCollection = collection(this.firestore, `channels/${currentChat.id}/messages`);
      const q = query(messageCollection, orderBy('timeInMs', 'desc'), limit(50));
      this.unSubChannelMessages = onSnapshot(q, async (snapshot) => {
        this.allMessagesOfChannel = await Promise.all(snapshot.docs.map(async doc => {
          const message = doc.data() as Message;
          message.id = doc.id;
          message.threadCount = await this.threadService.countThreadMessages(message.id);
          message.reactionCount = this.setEmojiCount(message.reaction);
          return message;
        }));
        this.allMessagesOfChannel.reverse();
        this.organizeMessagesByDate();
        this.messageAdded.emit();
      });
    }
  }

  organizeMessagesByDate() {
    this.messagesByDate = {};
    for (const message of this.allMessagesOfChannel) {
      const messageDate = message.date;
      if (messageDate) {
        if (!this.messagesByDate[messageDate]) {
          this.messagesByDate[messageDate] = [];
        }
        this.messagesByDate[messageDate].push(message);
      }
    }
    this.organizedChannelMessages = Object.entries(this.messagesByDate).map(([date, messages]) => ({ date, messages }));
  }


  async sendMessageInChannel(channel: Channel, message: Message) {
    let channelId = channel.id;
    const subColRef = collection(this.firestore, `channels/${channelId}/messages`);
    await addDoc(subColRef, message.toJSON())
    .catch((err) => {
      console.log('Error', err);
    })
    .then((docRef: void | DocumentReference<DocumentData, DocumentData>) => {
      if (docRef && docRef instanceof DocumentReference) {
        if (channelId) {
          this.updateMessageId(`channels/${channelId}/messages`, message, docRef.id);
        }
      }
    });
  }

  async updateMessageId(colId: string, message: Message, newId: string) {
    message.id = newId;
    await this.updateChannelMessage(colId, message);
  }

  
  async updateChannelMessage(colId: string, message: Message) {
    const docRef = doc(collection(this.firestore, colId), message.id);
    await updateDoc(docRef, this.getUpdateChannelMessageData(message)).catch(
      (error) => { console.log('error', error); }
    );
  }

  getUpdateChannelMessageData(message: Message) {
    return {
      id: message.id,
    };
  }

  async getAllChannelMembers(channelId: any) {
    if (channelId) {
      const channelDocRef = doc(this.firestore, `channels/${channelId}`);
      const channelDocSnap = await getDoc(channelDocRef);
      if (channelDocSnap.exists()) {
        const channelData = channelDocSnap.data();
        this.allChannelMembers = channelData?.['members'];
        this.updateOnlineStatus();
        this.firstThreeItems = this.allChannelMembers.slice(0, 3);
      }
    }
  }

  updateOnlineStatus() {
    this.allChannelMembers.forEach(member => {
      let userIndex = this.authService.findUserIndexWithEmail(member.email);
      member.online = this.userService.users[userIndex].online;
    });
  }

  //----------------------Thread ----------------------------------------------
  loadThread(threadId: any) {
    if (threadId) {
      const threadCollection = collection(this.firestore, `threads/${threadId}/messages`);
      console.log('message', threadCollection);
      const q = query(threadCollection, orderBy('timeInMs', 'desc'), limit(50));
      this.unSubThread = onSnapshot(q, (snapshot) => {
        this.allThreadMessages = snapshot.docs.map(doc => {
          const message = doc.data() as Message;
          message.id = doc.id;
          message.reactionCount = this.setEmojiCount(message.reaction);
          console.log('show me', message);
          return message;
        });
        this.allThreadMessages.reverse()
      });
    }
  }

 

  //----------- search Input Main Chat ----------------------------------
  async loadUsers() {
    const querySnapshot = await getDocs(collection(this.firestore, 'users'));
    this.allUsers = querySnapshot.docs.map((doc: { data: () => any; }) => new User(doc.data()));
    this.setUsersToOffline();
  }


  async setUsersToOffline() {
    let time = this.getLoginTime();
    this.allUsers.forEach(user => {
      if (time - user.loginTime > 10000000 && user.online == true) {
        user.online = false;
        this.userService.updateUser(user);
      }
    });
  }

  getLoginTime() {
    const currentTime = new Date();
    return currentTime.getTime();
  }

  filterAllUsers() {
    this.filteredUsers = this.allUsers.filter(user =>
      user.name?.toLowerCase().includes(this.searchInput.toLowerCase())
    );
  }

  //--------------------------------------------------------------------------------
  async addReaction(emoji: any, messageId: any, chatId: any, colId: any) {
    if (chatId) {
      let allMessages: any[] = [];
      if (colId == 'channels') {
        allMessages = this.allMessagesOfChannel;
      } else if (colId == 'threads') {
        allMessages = this.allThreadMessages;
      } else if (colId == 'direct messages') {
        allMessages = this.allDirectMessages;
      }
      this.pushReaction(allMessages, emoji, messageId, chatId, colId)
    }
  }

  pushReaction(allMessages: any[], emoji: any, messageId: any, chatId: any, colId: any) {
    const subReactionColRef = doc(collection(this.firestore, `${colId}/${chatId}/messages/`), messageId);
      let messageIndex = allMessages.findIndex(message => message.id === messageId);
      let currentMessage = allMessages[messageIndex];
      const reactionItem = { emoji, creatorId: this.userService.currentUser.id, creator: this.userService.currentUser.name };
      if (currentMessage.reaction.some((emojiArray: { emoji: string; creatorId: string; }) => emojiArray.emoji === emoji && emojiArray.creatorId === this.userService.currentUser.id)) {
        currentMessage.reaction = currentMessage.reaction.filter((emojiArray: { emoji: string; creatorId: string; }) => !(emojiArray.emoji === emoji && emojiArray.creatorId === this.userService.currentUser.id));
      } else {
        currentMessage.reaction.push(reactionItem);
      }
      updateDoc(subReactionColRef, this.updateMessage(allMessages[messageIndex]));
  }

  updateMessage(message: any) {
    return {
      reaction: message.reaction
    }
  }

  setEmojiCount(reactions: any[]) {
    let counter: { [key: string]: number  } = {};
    reactions.forEach(react => {
      let key = JSON.stringify(react.emoji);
      if (key) {
        key = key.substring(1);
        key = key.substring(0, key.length - 1);
      }
      if (counter[key]) {
        counter[key]++;
      } else {
        if (key != undefined)
          counter[key] = 1;
      }
    });
    return counter;
  }

  // ---------------- Direct messages ----------------------------------------------
  /**
   * Loads all messages of each dm
   * @param chatId 
   */
  async loadDirectMessages(chatId: any) {
    if (chatId) {
      const messageCollection = collection(this.firestore, `direct messages/${chatId}/messages`);
      const q = query(messageCollection, orderBy('timeInMs', 'desc'), limit(50));
      this.unSubDirectMessages = onSnapshot(q, async (snapshot) => {
        this.allDirectMessages = await Promise.all(snapshot.docs.map(async doc => {
          const message = doc.data() as Message;
          message.reactionCount = this.setEmojiCount(message.reaction);
          message.id = doc.id;
          message.threadCount = await this.threadService.countThreadMessages(message.id);
          return message;
        }));
        this.allDirectMessages.reverse();
        this.organizeDirectMessagesByDate();
        this.checkMessageNumbers();
      });
    }
  }

  /**
   * Sorts all messages according to their date
   */
  organizeDirectMessagesByDate() {
    this.messagesByDate = {};
    for (const message of this.allDirectMessages) {
      const messageDate = message.date;
      if (messageDate) {
        if (!this.messagesByDate[messageDate]) {
          this.messagesByDate[messageDate] = [];
        }
        this.messagesByDate[messageDate].push(message);
      }
    }
    this.organizedDirectMessages = Object.entries(this.messagesByDate).map(([date, messages]) => ({ date, messages }));
  }

  checkMessageNumbers() {
    if (this.allDirectMessages.length > 0) {
      this.messageIsExisting = true;
    } else {
      this.messageIsExisting = false
    }
  }

  async sendMessageInDirectMessage(chatId: any, message: Message) {
    const subColRef = collection(this.firestore, `direct messages/${chatId}/messages`);
    await addDoc(subColRef, message.toJSON())
      .catch((err) => {
        console.log(err);
      })
      .then((docRef: void | DocumentReference<DocumentData, DocumentData>) => {
        if (docRef && docRef instanceof DocumentReference) {
          if (chatId) {
            this.updateMessageId(`direct messages/${chatId}/messages`, message, docRef.id);
          }
        }
      });
  }

  toggleMoreMenu(message: Message) {
    message.messageSelected = !message.messageSelected;
  }

  /**
   * Deletes messages of every chats --------------------------------------------------------------------
   * @param colId - collection reference
   * @param chatId - document reference
   * @param messageId - id of message
   */
  async deleteMessageOfChat(colId: any, chatId: any, messageId: any) {
    if (colId == 'channels') {
      this.deletMessage(colId, chatId, messageId)
    } else if (colId == 'threads') {
      this.deletMessage(colId, chatId, messageId)
    } else if (colId == 'direct messages') {
      this.deletMessage(colId, chatId, messageId)
    }
  }

  async deletMessage(colId: any, chatId: any, messageId: any) {
    const messageDocRef = doc(collection(this.firestore, `${colId}/${chatId}/messages`), messageId);
    await deleteDoc(messageDocRef);
  }
  // ---------------------------------------------------------------------------------------------------
}