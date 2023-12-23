import { EventEmitter, Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { Firestore, collection, doc, onSnapshot, addDoc, deleteDoc, updateDoc, DocumentReference, DocumentData, getDoc, setDoc, arrayUnion, } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { User } from 'src/models/user.class';
import { Chat } from 'src/models/chat.class';
import { Channel } from 'src/models/channel.class';

@Injectable({
  providedIn: 'root'
})

export class UserService {
  firestore: Firestore = inject(Firestore);
  users: User[] = [];
  currentUser: User = new User;
  currentEmail: string = "";
  currentPassword: string = "";
  customPic: any = "";
  userIsAvailable: boolean = false;
  resetEmailFound: boolean = false;
  openUserContainerTextfield = new BehaviorSubject<boolean>(false);
  nameStringForTextfield: any;
  openUserContainerThreadTextfield = new BehaviorSubject<boolean>(false);
  chat: Chat = new Chat();
  channelEdited = new EventEmitter<void>();
  profileEdited = new EventEmitter<void>();
  unsubList;

  ngOnInit() {
    this.getCurrentUserFromLocalStorage();
  }

  constructor(public router: Router) {
    this.unsubList = this.subUserList();
  }

  ngOnDestroy() {
    this.unsubList();
  }

  /**
 * Sets user data with default values based on the provided object.
 * @param {Object} obj - The object containing user data properties.
 * @returns - An object representing user data with default values.
 */
  setUserData(obj: any,) {
    return {
      name: obj.name || "",
      email: obj.email || "",
      password: obj.password || "",
      id: obj.id,
      picture: obj.picture || "",
      online: obj.online || false,
    }
  }

  /**
   * Asynchronously adds a user to the Firestore database, updates the user ID, and creates a direct message.
   * @param {User} item - The user object to be added to the database.
   * @returns - A promise that resolves when the user is successfully added and processed.
   */
  async addUser(item: User) {
    await addDoc(this.getUsersRef(), item.toJSON()).catch(
      (err) => { console.log(err) })
      .then((docRef) => {
        this.updateUserId(item, docRef!.id);
        this.addNewUserToCommunityChannel(item);
        this.createDirectMessage(item);
      }
      )
  }

  async addNewUserToCommunityChannel(newUser: User) {
    const communityRef = doc(collection(this.firestore, 'channels'), 'pc0SH2i3MX85Uck7mLhd');
    try {
      const newUserJSON = newUser.toJSON();
      await updateDoc(communityRef, {
        members: arrayUnion(newUserJSON),
      });
    } catch (err) {
      console.error(err);
    }
  }

  /**
   * Subscribes to changes in the user list in Firestore and updates the local users array accordingly.
   * The function returns an unsubscribe function to stop listening to changes.
   * @returns - A function to unsubscribe from the user list changes.
   */
  subUserList() {
    return onSnapshot(this.getUsersRef(), (list) => {
      this.users = [];
      list.forEach(element => {
        this.users.push(element.data() as User);
      })
    })
  }

  /**
   * Asynchronously deletes a document from a Firestore collection.
   * @param {string} colId - The ID of the collection containing the document to be deleted.
   * @param {string} docId - The ID of the document to be deleted.
   * @returns - A promise that resolves when the document is successfully deleted.
   */
  async deleteUser(colId: string, docId: string) {
    await deleteDoc(this.getSingleDocRef(colId, docId))
      .catch((err) => {
        console.log(err);
      })
  }

  /**
   * Asynchronously updates the ID of a user and persists the changes to Firestore.
   * @param {User} user - The user object to be updated.
   * @param {string} newId - The new ID to be assigned to the user.
   * @returns - A promise that resolves when the user ID is successfully updated.
   */
  async updateUserId(user: User, newId: string,) {
    user.id = newId;
    await this.updateUser(user);
  }

  /**
   * Asynchronously updates a user document in the 'users' Firestore collection.
   * @param {User} user - The user object containing updated information.
   * @returns - A promise that resolves when the user document is successfully updated.
   */
  async updateUser(user: User) {
    if (user.id) {
      let docRef = this.getSingleDocRef('users', user.id || '');
      await updateDoc(docRef, this.getUpdateData(user)).catch(
        (error) => { console.log(error); }
      );
    }
  }

  /**
   * Returns an object containing user data suitable for updating a Firestore document.
   * @param {User} user - The user object with updated information.
   * @returns - An object representing the user data suitable for updating a Firestore document.
   */
  getUpdateData(user: User) {
    return {
      name: user.name,
      email: user.email,
      password: user.password,
      id: user.id,
      picture: user.picture,
      online: user.online,
      loginTime: user.loginTime,
    }
  }

  /**
   * Opens the user container text field after a short delay.
   * Uses a timeout to set the 'openUserContainerTextfield' property to true.
   * Intended for triggering UI changes with a slight delay.
   */
  openUserContainerTextField() {
    setTimeout(() => {
      this.openUserContainerTextfield.next(true);
    }, 10);
  }

  /**
   * Opens the user container thread text field after a short delay.
   * Uses a timeout to set the 'openUserContainerThreadTextfield' property to true.
   * Intended for triggering UI changes with a slight delay.
   */
  openUserContainerThreadTextField() {
    setTimeout(() => {
      this.openUserContainerThreadTextfield.next(true);
    }, 10);
  }

  /**
   * Serializes the current user object to JSON and stores it in the local storage.
   * Uses the key 'currentUser' for storing in the local storage.
   */
  setCurrentUserToLocalStorage() {
    let userJson = JSON.stringify(this.currentUser);
    localStorage.setItem('currentUser', userJson);
  }

  /**
   * Serializes the current user object to JSON and stores it in the local storage.
   * Uses the key 'currentUser' for storing in the local storage.
   */
  getCurrentChatFromLocalStorage() {
    const chatJson = localStorage.getItem('currentChat');
    if (chatJson) {
      return JSON.parse(chatJson) as Channel;
    } else {
      return
    }
  }

  /**
   * Removes the serialized current user object from the local storage.
   * Uses the key 'currentUser' for removal in the local storage.
   */
  removeCurrentUserFromLocalStorage() {
    localStorage.removeItem('currentUser');
  }

  /**
   * Retrieves the serialized current user from local storage and updates the 'currentUser' property.
   * Uses the key 'currentUser' for retrieval from local storage.
   * @returns {void}
   */
  getCurrentUserFromLocalStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.currentUser = JSON.parse(userJson) as User;
    } else {
      this.currentUser = new User;
    }
  }

  /**
   * Serializes the provided current chat object to JSON and stores it in local storage.
   * Uses the key 'currentChat' for storing in local storage.
   * @param {any} currentChat - The current chat object to be stored.
   * @returns 
   */
  setCurrentChatToLocalStorage(currentChat: any) {
    let channelJson = JSON.stringify(currentChat);
    localStorage.setItem('currentChat', channelJson);
  }

  /**
   * Removes the serialized current chat object from local storage.
   * Uses the key 'currentChat' for removal in local storage.
   *
   * @returns
   */
  removeCurrentChatFromLocalStorage() {
    localStorage.removeItem('currentChat');
  }

  /**
   * This is for getting the collection "customers" from firebase 
   */
  getUsersRef() {
    return collection(this.firestore, 'users');
  }

  /**
   * Retrieves a reference to a single document in a Firestore collection.
   * @param {string} colId - The ID of the collection containing the document.
   * @param {string} docId - The ID of the document to retrieve.
   * @returns - A reference to the specified document.
   */
  getSingleDocRef(colId: string, docId: string) {
    return doc(collection(this.firestore, colId), docId);
  }

  /**
   * Checks if a user with the specified email exists in the current user list.
   * @param {string} email - The email address to check for existence.
   * @returns - True if a user with the specified email exists, otherwise false.
   */
  userExists(email: string): boolean {
    return this.users.some(user => user.email === email);
  }

  /**
   * Asynchronously creates a direct message chat with the specified user.
   * Checks if the direct message already exists, and creates a new one if not.
   * Updates the chat type to 'direct' and sets the chat details in Firestore.
   * Also sets the created chat to local storage.
   * @param {User} user - The user to create a direct message chat with.
   * @returns - A promise that resolves when the direct message chat is successfully created.
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
          console.log('error', err);
        })
      this.setPersonalChatToLocalStorage(this.chat);
    }
  }

  /**
   * This function sets the name of a dm by combining the user name with current user name
   * @param user 
   */
  checkUserForDirectMessageName(user: User) {
    this.chat.name = user.name;
  }

  /**
   * This function sets the document reference for a dm by combining the user id with the currentUser id
   * @param user 
   * @returns id for docRef
   */
  checkUserForId(user: User) {
    this.chat.members = []
    let userId = user.id;
    let currentUserData = this.convertUser(user);
    this.chat.members.push(currentUserData);
    this.chat.id = userId;
    return userId
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

  /**
   * Serializes the provided chat object to JSON and stores it in local storage.
   * Uses the key 'currentChat' for storing in local storage.
   * @param {Chat} chat - The chat object to be stored.
   * @returns
   */
  setPersonalChatToLocalStorage(chat: Chat) {
    let channelJson = JSON.stringify(chat);
    localStorage.setItem('currentChat', channelJson);
  }
}