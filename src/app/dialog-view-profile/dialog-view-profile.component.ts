import { Component, ElementRef, Inject, OnInit, ViewChild, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { User } from 'src/models/user.class';
import { FirestoreService } from '../services/firestore.service';
import { ChatService } from '../services/chat.service';
import { Router } from '@angular/router';
import { DocumentData, collection, doc } from 'firebase/firestore';
import { Firestore, getDoc, getDocs, query, updateDoc, where } from '@angular/fire/firestore';
import { Channel } from 'src/models/channel.class';
import { Chat } from 'src/models/chat.class';
import { ThreadService } from '../services/thread.service';

@Component({
  selector: 'app-dialog-view-profile',
  templateUrl: './dialog-view-profile.component.html',
  styleUrls: ['./dialog-view-profile.component.scss', './dialog-view-profile.mediaquery.component.scss']
})

export class DialogViewProfileComponent {
  firestore: Firestore = inject(Firestore);
  editState: boolean = false;
  currentUser: User;
  user: User = new User();
  editedUser: User = new User();
  currentChat!: any;
  channel: Channel = new Channel;
  dm: Chat = new Chat
  channelMembers!: any[];
  directMessageMembers!: any[];

  constructor(
    public dialogRef: MatDialogRef<DialogViewProfileComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { userID: string },
    public userService: UserService,
    public authService: AuthService,
    public firestoreService: FirestoreService, public chatService: ChatService, public router: Router, public threadService: ThreadService) {
    this.currentUser = this.userService.currentUser;
    this.setUser();
  }

  /**
   * Sets the user profile to be viewed.
   */
  setUser() {
    const users = this.userService.users;
    const index = users.findIndex(user => user.id == this.data.userID);
    this.user = users[index] as User;
    this.editedUser = { ...this.user } as User;
  }

  /**
   * Allows the current user to edit their profile. It saves the updated user data
   * to local storage and updates the user information in the database.
   */
  async editUser() {
    this.user = this.editedUser;
    this.userService.currentUser = this.user;
    this.chatService.closeThread();
    await this.userService.updateUser(this.user);
    this.authService.updateUserEmail(this.user.email!);
    this.dialogRef.close();
    await this.updateCurrentUserInChannel(this.user);
    await this.updateChannelMessages(this.user);
    await this.updateCurrentUserInDirect(this.user);
    await this.updateDMMessages(this.user);
    if (this.chatService.isMobile) {
      this.updateThreadMessages(this.user);
    }
    this.userService.setCurrentUserToLocalStorage();
    this.updateLocalStorage(this.user);
    this.userService.profileEdited.emit();
  }

  /**
   * Handles the selection of a new profile image file.
   * Validates the file size and uploads the image to the server, updating the user profile.
   * @param {Event} event - The file input change event containing the selected file.
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
      this.updateUserView();
      event.target.value = '';
    }
  }

  /**
   * Updates values of user view
   */
  updateUserView() {
    setTimeout(() => {
      this.user.picture = this.authService.customPic;
      this.userService.currentUser.picture = this.user.picture;
      this.userService.updateUser(this.user);
      this.firestoreService.showSpinner = false;
    }, 1500);
  }

  /**
   * Opens a direct Chat with selected User.
   */
  selectUser(user: any) {
    this.chatService.createDirectMessage(user);
    this.chatService.chatWindow = 'direct';
    if (this.chatService.isMobile) {
      this.router.navigate(['main']);
    }
    this.dialogRef.close();
  }

  async updateCurrentUserInChannel(user: User) {
    await this.chatService.getallChannels();
    const yourChannels = this.chatService.yourChannels;
    for (const channel of yourChannels) {
      const currentUserIndex = channel.members.findIndex((member: { id: string | undefined; }) => member.id == user.id);
      if (currentUserIndex !== -1) {
        channel.members[currentUserIndex].name = user.name;
        channel.members[currentUserIndex].email = user.email;
      }
      const channelDocRef = doc(collection(this.firestore, 'channels'), channel.id);
      if (channel.creatorId == user.id) {
        await updateDoc(channelDocRef, {
          members: channel.members,
          creator: user.name
        });
      } else {
        await updateDoc(channelDocRef, {
          members: channel.members,
        });
      }
    }
  }

  async updateCurrentUserInDirect(user: User) {
    await this.chatService.loadAllDirectMessages();
    const yourDMs = this.chatService.yourDirectMessages;
    for (const dm of yourDMs) {
      const currentUserIndex = dm.members.findIndex((member: { id: string | undefined; }) => member.id == user.id);
      if (currentUserIndex !== -1) {
        dm.members[currentUserIndex].name = user.name;
        dm.members[currentUserIndex].email = user.email;
      }
      const directDocRef = doc(collection(this.firestore, 'direct messages'), dm.id);
      await updateDoc(directDocRef, {
        members: dm.members,
      });
    }
  }

  async updateChannelMessages(user: User) {
    let channelMessages: any[];
    await this.chatService.getallChannels();
    await this.chatService.getAllChannelMessages();
    channelMessages = this.chatService.allMessagesOfChannel;
    channelMessages.forEach((message) => {
      if (message.creatorId === user.id) {
        let messageDocRef = doc(collection(this.firestore, `channels/${message.channelID}/messages`), message.id);
        updateDoc(messageDocRef, {
          creator: user.name
        })
      }
    })
  }

  async updateDMMessages(user: User) {
    let dmMessages: any[];
    await this.chatService.loadAllDirectMessages();
    await this.chatService.getDMMessages();
    dmMessages = this.chatService.allMessagesOfDM;
    dmMessages.forEach((message) => {
      if (message.creatorId === user.id) {
        let messageDocRef = doc(collection(this.firestore, `direct messages/${message.channelID}/messages`), message.id);
        updateDoc(messageDocRef, {
          creator: user.name
        })
      }
    })
  }

  updateLocalStorage(user: User) {
    this.currentChat = this.userService.getCurrentChatFromLocalStorage();
    if (this.currentChat.type == 'direct' && this.currentChat) {
      const currentUserIndex = this.currentChat.members.findIndex((member: { id: string | undefined; }) => member.id == user.id);
      if (currentUserIndex !== -1) {
        this.currentChat.members[currentUserIndex].name = user.name;
        this.currentChat.members[currentUserIndex].email = user.email;
        this.userService.setCurrentChatToLocalStorage(this.currentChat);
      }
    } else if (this.currentChat.type == 'channel' && this.currentChat) {
      const currentUserIndex = this.currentChat.members.findIndex((member: { id: string | undefined; }) => member.id == user.id);
      if (currentUserIndex !== -1) {
        this.currentChat.members[currentUserIndex].name = user.name;
        this.currentChat.members[currentUserIndex].email = user.email;
        if (this.currentChat.creatorId == user.id) {
          this.currentChat.creator = user.name;
        }
        this.userService.setCurrentChatToLocalStorage(this.currentChat);
      }
    } else {
      return
    }
  }

  async updateThreadMessages(user: User) {
    let threadMessages: any[];
    await this.threadService.getallThreads();
    await this.threadService.getThreadMessages();
    threadMessages = this.threadService.allThreadMessages;
    threadMessages.forEach((message) => {
      if (message.creatorId === user.id) {
        let messageDocRef = doc(collection(this.firestore, `threads/${message.channelID}/messages`), message.id);
        updateDoc(messageDocRef, {
          creator: user.name
        })
      }
    })
  }
}