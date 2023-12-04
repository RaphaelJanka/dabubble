import { Injectable, OnInit, inject } from '@angular/core';
import { Firestore, getDoc, onSnapshot, orderBy, query, setDoc } from '@angular/fire/firestore';
import { DocumentData, DocumentReference, collection, doc } from 'firebase/firestore';
import { Channel } from 'src/models/channel.class';
import { Chat } from 'src/models/chat.class';
import { BehaviorSubject, Observable } from 'rxjs';
import { User } from 'src/models/user.class';
import { UserService } from './user.service';
import { Message } from 'src/models/message.class';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private _openChatSubject: BehaviorSubject<Channel | Chat | null> = new BehaviorSubject<Channel | Chat | null>(null);
  private _openDirectMessageSubject: BehaviorSubject<Chat | null> = new BehaviorSubject<Chat | null>(null);
  firestore: Firestore = inject(Firestore)
  chatWindow = 'empty';
  chat: Chat = new Chat();
  unSubChannels: any;
  unSubMessages: any;
  allChannels: any[] = [];
  yourChannels: any[] = [];
  allMessagesOfChannel: any[] = [];
  unSubUsers: any;
  allUsers: any[] = [];

  constructor(public userService: UserService) {
    this.getallChannels();
    this.getAllUsers();
  }

  // -------------- channel -----------------------


  get openChat$(): Observable<Channel | Chat | null> {
    return this._openChatSubject.asObservable();
  }

  set openChat(value: Channel | Chat | null) {
    this._openChatSubject.next(value);
  }

  // ----------------- Direct Message --------------------------
  get openDirectMessage$(): Observable<Chat | null> {
    return this._openDirectMessageSubject.asObservable();
  }

  set openDirectMessage(value: Chat | null) {
    this._openDirectMessageSubject.next(value);
  }


  // Create direct messages ------------------------------
  async createDirectMessage(user: User) {
    this.checkUserForDirectMessageName(user);
    const directMessageRef = collection(this.firestore, 'direct messages');
    const specificDocRef: DocumentReference<DocumentData> = doc(directMessageRef, this.checkUserForId(user));
    const docSnapshot = await getDoc(specificDocRef);
    if (!docSnapshot.exists()) {
      await setDoc(specificDocRef, {
        ...this.chat.toJSON(),
      })
        .catch((err) => {
          console.log('error', err);
        });
    }
  }


  checkUserForId(user: User) {
    if (user.id !== this.userService.currentUser.id) {
      let sortedUserIds = [user.id, this.userService.currentUser.id].sort();
      let userId = sortedUserIds.join('');
      let userData = this.convertUser(user);
      let currentUserData = this.convertUser(this.userService.currentUser);
      this.chat.members.push(userData, currentUserData);
      this.chat.id = userId;
      return userId
    } else {
      let userId = this.userService.currentUser.id;
      let currentUserData = this.convertUser(this.userService.currentUser);
      this.chat.members.push(currentUserData);
      this.chat.id = userId;
      return userId
    }
  }

  checkUserForDirectMessageName(user: User) {
    if (user.id !== this.userService.currentUser.id) {
      let sortedUserNames = [user.name, this.userService.currentUser.name].sort();
      let userChatName = sortedUserNames.join(' ');
      this.chat.name = userChatName;
    } else {
      this.chat.name = this.userService.currentUser.name;
    }
  }


  convertUser(user: any): any {
    return {
      name: user.name,
      email: user.email,
      password: user.password,
      id: user.id,
      picture: user.picture,
    };
  }

  //-----------------------------------------



  // ---------------- Search function ---------------
  getallChannels() {
    this.unSubChannels = onSnapshot(
      query(collection(this.firestore, "channels"), orderBy("name")),
      (snapshot) => {
        this.allChannels = snapshot.docs.map((doc) => {
          const channel = doc.data() as Channel;
          channel.id = doc.id;
          return channel;
        });
        //  console.log('all Channels', this.allChannels);
        this.getPersonalChannels();
      }
    );
  }

  getPersonalChannels() {
    this.yourChannels = [];
    this.allChannels.forEach(channel => {
      if (channel.members.some((member: { id: string; }) => member.id === this.userService.currentUser.id)) {
        // console.log(channel);
        this.yourChannels.push(channel);
      }
    });
    this.getAllMessages();
  }

  ngOnDestroy() {

  }

  getAllMessages() {
    this.yourChannels.forEach(channel => {
      // console.log('id', channel.id); 
      const messageCol = collection(this.firestore, `channels/${channel.id}/messages`);
      this.unSubMessages = onSnapshot(messageCol,
        (list) => {
          list.forEach(message => {
            this.allMessagesOfChannel.push(message.data());
          });
        }
      );
    });
    // console.log('check', this.allMessagesOfChannel);
  }


  getAllUsers() {
    const userCol = collection(this.firestore, 'users');
    this.unSubUsers = onSnapshot(userCol,
      (list) => {
        list.forEach(user => {
          this.allUsers.push(user.data());
        });
      }
    );
    // console.log('check Users', this.allUsers);
  }


}
