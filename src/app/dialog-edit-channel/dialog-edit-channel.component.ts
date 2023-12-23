import { Component, ElementRef, HostListener, Inject, OnInit, Optional, inject } from '@angular/core';
import { Channel } from 'src/models/channel.class';
import { ChatService } from '../services/chat.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { UserService } from '../services/user.service';
import { Firestore, collection, doc, getDoc, updateDoc } from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { DialogViewProfileComponent } from '../dialog-view-profile/dialog-view-profile.component';
import { FirestoreService } from '../services/firestore.service';
import { ViewChild } from '@angular/core';

@Component({
  selector: 'app-dialog-edit-channel',
  templateUrl: './dialog-edit-channel.component.html',
  styleUrls: ['./dialog-edit-channel.component.scss', './dialog-edit-channel.mediaquery.component.scss']
})
export class DialogEditChannelComponent implements OnInit {
  editName: boolean = false;
  editDescription: boolean = false;
  currentChat!: Channel | undefined;
  allChannelMembers: any[] = [];
  channel: Channel = new Channel();
  firestore: Firestore = inject(Firestore);
  currentUser;
  newChannelMembers: any[] = [];
  unSubChannel: any;
  newChannelName = this.currentChat?.name;
  newChannelDescription = this.currentChat?.description;
  @ViewChild('newName') newName!: ElementRef;
  @ViewChild('newDescription') newDescription!: ElementRef;

  constructor(
    public chatService: ChatService, @Optional() @Inject(MatDialogRef) public dialogRef: MatDialogRef<DialogEditChannelComponent> | undefined,
    public userService: UserService, public authService: AuthService, public router: Router, public dialog: MatDialog, public firestoreService: FirestoreService) {
    this.currentUser = this.userService.currentUser;
    this.currentChat = this.userService.getCurrentChatFromLocalStorage();
    chatService.checkScreenWidth();
    if (chatService.isMobile) {
      this.dialogRef = undefined
    }
  }

  ngOnInit() {
    this.chatService.openChat$.subscribe((openChat) => {
      if (openChat) {
        this.currentChat = openChat as Channel;
        this.getAllChannelMembers();
      }
    });
    this.userService.profileEdited.subscribe(() => {
      this.getAllChannelMembers();
    })
  }

  /**
   * Fetches all members of the current channel from Firestore and assigns them to the local array.
   */
  async getAllChannelMembers() {
    if (this.currentChat?.id) {
      const channelDocRef = doc(this.firestore, `channels/${this.currentChat.id}`);
      const channelDocSnap = await getDoc(channelDocRef);
      if (channelDocSnap.exists()) {
        const channelData = channelDocSnap.data();
        this.allChannelMembers = channelData?.['members'];
      }
    }
  }

  /**
   * Performs cleanup by unsubscribing from any subscriptions to avoid memory leaks.
   */
  ngOnDestroy() {
    if (this.unSubChannel) {
      this.unSubChannel();
    }
  }

  /**
   * Removes the current user from the channel members list and updates the Firestore document.
   */
  async deleteCurrentUserFromChannel() {
    this.deleteCurrentUser();
    if (this.currentChat) {
      const channelDocRef = doc(collection(this.firestore, 'channels'), this.currentChat.id);
      this.setChannelValues();
      await updateDoc(channelDocRef, this.channel.toJSON()).catch((error) => {
        console.error('Error updating document:', error);
      });
    }
    if (this.chatService.isMobile) {
      this.router.navigate(['home']);
    } else {
      this.dialogRef?.close();
    }
    this.chatService.setEmptyChatToLocalStorage();
    this.chatService.openChat = null;
  }

  /**
   * Sets new values for channel
   */
  setChannelValues() {
    if (this.currentChat) {
      this.channel.members = this.newChannelMembers;
      this.channel.name = this.currentChat.name;
      this.channel.id = this.currentChat.id;
      this.channel.description = this.currentChat.description;
    }
  }

  /**
   * Filters out the current user from the list of all channel members.
   */
  deleteCurrentUser() {
    const currentUserisMember = this.allChannelMembers.some(user => user.id === this.currentUser.id);
    if (currentUserisMember) {
      this.allChannelMembers = this.allChannelMembers.filter(user => user.id !== this.currentUser.id);
      this.newChannelMembers = this.allChannelMembers;
    }
  }

  /**
   * Logs out the current user and navigates back to the login screen.
   */
  logOutUser() {
    this.authService.signOutUser();
    this.router.navigate(['']);
  }

  /**
   * Opens the profile dialog for viewing the details of a specific user.
   * @param {any} id - The ID of the user whose profile is to be viewed.
   */
  openProfileDialog(id: any): void {
    this.dialog.open(DialogViewProfileComponent, {
      panelClass: 'dialog-container',
      data: { userID: id },
    });
  }

  /**
   * Navigates back to the main chat window.
   */
  backToChat() {
    this.router.navigate(['home']);
  }

  /**
   * 
   */
  editChannel() {
    if (this.editName) {
      this.editName = false
      this.currentChat!.name = this.newName.nativeElement.value!;
    }
    if (this.editDescription) {
      this.editDescription = false;
      this.currentChat!.description = this.newDescription.nativeElement.value!;
    }
    this.firestoreService.updateChannel('channels', this.currentChat!);
    this.userService.setCurrentChatToLocalStorage(this.currentChat!);
  }
}