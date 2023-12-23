import { Injectable, inject } from '@angular/core';
import { Firestore, getDoc, getDocs, onSnapshot, orderBy, query, setDoc } from '@angular/fire/firestore';
import { DocumentData, DocumentReference, collection, doc } from 'firebase/firestore';
import { Channel } from 'src/models/channel.class';
import { Chat } from 'src/models/chat.class';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from 'src/models/user.class';
import { UserService } from './user.service';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private _openChatSubject: BehaviorSubject<Channel | null> = new BehaviorSubject<Channel | null>(null);
  private _openDirectMessageSubject: BehaviorSubject<Chat | null> = new BehaviorSubject<Chat | null>(null);
  public workspaceDrawerStateSubject = new BehaviorSubject<boolean>(true);
  public threadDrawerStateSubject = new BehaviorSubject<boolean>(false);
  workspaceDrawerState$ = this.workspaceDrawerStateSubject.asObservable();
  threadDrawerState$ = this.threadDrawerStateSubject.asObservable();
  firestore: Firestore = inject(Firestore)
  chatWindow = 'empty';
  chat: Chat = new Chat();
  unSubChannels: any;
  unSubDMMessages: any;
  unSubChannelMessages: any;
  allChannels: any[] = [];
  allDirectMessages: any[] = [];
  allLoadedDirectMessages: any[] = [];
  yourChannels: any[] = [];
  yourDirectMessages: any[] = [];
  allMessagesOfChannel: any[] = [];
  unSubUsers: any;
  unSubDirectMessages: any;
  allUsers: any[] = [];
  allMessagesOfDM: any[] = [];
  isMobile: boolean = false;
  workspaceOpen: boolean = true;
  threadOpen: boolean = true;

  // -------------- channel -----------------------
  get openChat$(): Observable<Channel | null> {
    return this._openChatSubject.asObservable();
  }

  set openChat(channel: Channel | null) {
    this._openChatSubject.next(channel);
  }

  // ----------------- Direct Message --------------------------
  get openDirectMessage$(): Observable<Chat | null> {
    return this._openDirectMessageSubject.asObservable();
  }

  set openDirectMessage(chat: Chat | null) {
    this._openDirectMessageSubject.next(chat);
  }

  // Create direct messages ------------------------------

  constructor(public userService: UserService, public router: Router) {
    this.getallChannels();
    this.getAllUsers();
    this.loadAllDirectMessages();
  }

  async toggleWorkspace() {
    if (this.threadDrawerStateSubject.value == true && window.innerWidth >= 800 && window.innerWidth < 1350) {
      this.threadDrawerStateSubject.next(!this.threadDrawerStateSubject.value);
    }
    this.workspaceDrawerStateSubject.next(!this.workspaceDrawerStateSubject.value);
  }

  closeWorkspace() {
    this.workspaceDrawerStateSubject.next(false);
  }

  closeThread() {
    this.threadDrawerStateSubject.next(false);
  }
  openThread() {
    this.threadDrawerStateSubject.next(true);
  }

  ngOnDestroy() {
    this.unSubDirectMessages();
    this.unSubChannelMessages();
    this.unSubChannels();
  }

  /**
   * This function creates a direct message
   * @param user 
   */
  async createDirectMessage(user: User) {
    this.checkUserForDirectMessageName(user);
    this.chat.type = 'direct';
    const directMessageRef = collection(this.firestore, 'direct messages');
    const specificDocRef: DocumentReference<DocumentData> = doc(directMessageRef, this.checkUserForId(user));
    const docSnapshot = await getDoc(specificDocRef);
    if (!docSnapshot.exists()) {
      await setDoc(specificDocRef, {
        ...this.chat.toJSON(),
      })
        .catch((err) => {
        });
    }
    this.compareNewDirectMessageWithExisting(user);
  }

  /**
   * This function checks if a direct message is already existing
   * @param user 
   */
  compareNewDirectMessageWithExisting(user: User) {
    this.getAllDirectMessages()
      .then(() => {
        this.findDirectMessage(user);
      });
  }

  /**
   * This funtion loads all direct messages
   * @returns 
   */
  getAllDirectMessages(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.allDirectMessages = [];
      const directMessageCol = collection(this.firestore, 'direct messages');
      this.unSubDirectMessages = onSnapshot(directMessageCol,
        (list) => {
          list.forEach(chat => {
            this.allDirectMessages.push(chat.data());
          });
          resolve();
        },
        (error) => {
          reject(error);
        }
      );
    });
  }

  /**
   * This function searches for a existing dm
   * @param user 
   */
  findDirectMessage(user: User) {
    let directId: any;
    if (user.id !== this.userService.currentUser.id) {
      let sortedUserIds = [user.id, this.userService.currentUser.id].sort();
      directId = sortedUserIds.join('');
    } else {
      directId = this.userService.currentUser.id;
    }
    const foundDirectMessage = this.allDirectMessages.find(message => message.id === directId);
    this.renderDirectMessage(foundDirectMessage);
  }

  /**
   * This function sets the behaviorsubject to curren dm
   * @param chat 
   */
  renderDirectMessage(chat: Chat) {
    this.openDirectMessage = chat;
    this.chatWindow = 'direct';
    if (this.isMobile) {
      this.router.navigate(['directMessage'])
    }
  }

  //------------------------------------------------------------------------------------

  /**
   * This function sets the document reference for a dm by combining the user id with the currentUser id
   * @param user 
   * @returns id for docRef
   */
  checkUserForId(user: User) {
    this.chat.members = []
    if (user.id !== this.userService.currentUser.id) {
      return this.setIdForDirectMessage(user);
    } else {
      return this.setIdForPersonalChat();
    }
  }

  /**
   * Sets the ID and members for a direct message chat based on the provided user and the current user.
   * @param user The user for whom to set the direct message chat ID and members.
   * @returns 
   */
  setIdForDirectMessage(user: User) {
    let sortedUserIds = [user.id, this.userService.currentUser.id].sort();
    let userId = sortedUserIds.join('');
    let userData = this.convertUser(user);
    let currentUserData = this.convertUser(this.userService.currentUser);
    this.chat.members.push(userData, currentUserData);
    this.chat.id = userId;
    return userId
  }

  /**
   * Sets the ID and members for a personal chat based on the current user.
   * @returns The ID of the personal chat.
   */
  setIdForPersonalChat() {
    let userId = this.userService.currentUser.id;
    let currentUserData = this.convertUser(this.userService.currentUser);
    this.chat.members.push(currentUserData);
    this.chat.id = userId;
    return userId
  }

  /**
   * This function sets the name of a dm by combining the user name with current user name
   * @param user 
   */
  checkUserForDirectMessageName(user: User) {
    if (user.id !== this.userService.currentUser.id) {
      let sortedUserNames = [user.name, this.userService.currentUser.name].sort();
      let userChatName = sortedUserNames.join(' ');
      this.chat.name = userChatName;
    } else {
      this.chat.name = this.userService.currentUser.name;
    }
  }

  /**
   * Sets values of user
   * @param user 
   * @returns 
   */
  convertUser(user: any): any {
    return {
      name: user.name, email: user.email, password: user.password, id: user.id, picture: user.picture,
    };
  }

  // ---------------- Search function ----------------------------------------------

  /**
   * Loads all channels 
   */
  async getallChannels() {
    this.unSubChannels = onSnapshot(
      query(collection(this.firestore, "channels"), orderBy("name")),
      (snapshot) => {
        this.allChannels = snapshot.docs.map((doc) => {
          const channel = doc.data() as Channel;
          channel.id = doc.id;
          return channel;
        });
        this.getPersonalChannels();
      }
    );
  }

  /**
   * Sets personal channels
   */
  getPersonalChannels() {
    this.yourChannels = [];
    this.allChannels.forEach(channel => {
      if (channel.members.some((member: { id: string; }) => member.id === this.userService.currentUser.id)) {
        this.yourChannels.push(channel);
      }
    });
  }

  /**
   * Loads all messages of personal channels
   */
  async getAllChannelMessages() {
    this.allMessagesOfChannel = [];
    for (const channel of this.yourChannels) {
      const messageId = channel.id;
      const messageCol = collection(this.firestore, `channels/${messageId}/messages`);
      const querySnapshot = await getDocs(messageCol);
      querySnapshot.forEach((message) => {
        this.allMessagesOfChannel.push(message.data());
      });
    }
  }

  /**
   * Loads all direct messages
   */
  async loadAllDirectMessages() {
    this.unSubDirectMessages = onSnapshot(
      query(collection(this.firestore, "direct messages"), orderBy("name")),
      (snapshot) => {
        this.allLoadedDirectMessages = snapshot.docs.map((doc) => {
          const channel = doc.data() as Channel;
          channel.id = doc.id;
          return channel;
        });
        this.getPersonalDirectMessages();
      }
    );
  }

  /**
   * Sets all personal dms
   */
  getPersonalDirectMessages() {
    this.yourDirectMessages = [];
    this.allLoadedDirectMessages.forEach(dm => {
      if (dm.members.some((member: { id: string; }) => member.id === this.userService.currentUser.id)) {
        this.yourDirectMessages.push(dm);
      }
    });
  }

  /**
   * Loads all messages from personal dms
   */
  async getDMMessages() {
    this.allMessagesOfDM = [];
    for (const dm of this.yourDirectMessages) {
      const messageId = dm.id;
      const messageCol = collection(this.firestore, `direct messages/${messageId}/messages`);
      const querySnapshot = await getDocs(messageCol);
      querySnapshot.forEach((message) => {
        this.allMessagesOfDM.push(message.data());
      });
    }
  }

  /**
   * loads all users
   */
  getAllUsers() {
    // this.allUsers = [];
    const userCol = collection(this.firestore, 'users');
    this.unSubUsers = onSnapshot(userCol,
      (list) => {
        list.forEach(user => {
          this.allUsers.push(user.data());
        });
      }
    );
  }

  /**
   * Sets current channel
   * @param message 
   */
  getChannelByMessage(message: any) {
    let channel = this.allChannels.find(channel => channel.id === message.channelID);
    this.openChat = channel;
    this.chatWindow = 'channel';
    if (this.isMobile) {
      this.router.navigate(['main']);
    }
  }

  /**
   * Sets current dm
   * @param message 
   */
  getDirectMessageByMessage(message: any) {
    let direct = this.allLoadedDirectMessages.find(dm => dm.id === message.channelID);
    this.openDirectMessage = direct;
    this.chatWindow = 'direct';
    if (this.isMobile) {
      this.router.navigate(['main']);
    }
  }

  /**
   * Checks the screen width to determine if the current device is a mobile device.
   */
  checkScreenWidth(): void {
    this.isMobile = window.innerWidth < 800;
    if (!this.isMobile && this.router.url !== 'home') {
      this.router.navigate(['home']);
    }
  }

  /**
   * Sets an empty chat to local storage with default values.
   * Used to initialize or reset the current chat in local storage.
   */
  setEmptyChatToLocalStorage() {
    const emptyChat = new Chat({
      name: '',
      id: '',
      members: [],
      type: 'empty'
    });
    let emptyChatJson = JSON.stringify(emptyChat);
    localStorage.setItem('currentChat', emptyChatJson);
  }
}