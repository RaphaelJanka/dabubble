import { Component, Inject, OnInit, Optional, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DialogAddToGroupComponent } from '../dialog-add-to-group/dialog-add-to-group.component';
import { ChatService } from '../services/chat.service';
import { Channel } from 'src/models/channel.class';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-dialog-show-group-member',
  templateUrl: './dialog-show-group-member.component.html',
  styleUrls: ['./dialog-show-group-member.component.scss']
})
export class DialogShowGroupMemberComponent implements OnInit {
  currentChat!: Channel | undefined;
  allChannelMembers: any[] = [];
  firestore: Firestore = inject(Firestore);

  constructor(public dialog: MatDialog, @Optional() @Inject(MatDialogRef) public dialogRef: MatDialogRef<DialogShowGroupMemberComponent> | undefined,
    public chatService: ChatService, public authService: AuthService, public userService: UserService) {
    this.currentChat = this.userService.getCurrentChatFromLocalStorage();
    this.getAllChannelMembers();
    if (chatService.isMobile) {
      this.dialogRef = undefined;
    }
  }

  /**
   * Opens the dialog to add new members to the group.
   */
  openDialog() {
    this.dialog.open(DialogAddToGroupComponent, {
      panelClass: 'dialog-container'
    });
    this.dialogRef?.close()
  }

  /**
   * Initializes the component and subscribes to the chat service to receive the current chat.
   * When the current chat changes, it fetches the channel members.
   */
  ngOnInit() {
    this.chatService.openChat$.subscribe((openChat) => {
      if (openChat) {
        const newChat = openChat as Channel;
        if (!this.currentChat || this.currentChat.id !== newChat.id) {
          this.currentChat = newChat;
          this.getAllChannelMembers();
        }
      }
    });
  }

  /**
   * Fetches all members of the current chat's channel from Firestore and updates their online status.
   */
  async getAllChannelMembers() {
    if (this.currentChat?.id) {
      const channelDocRef = doc(this.firestore, `channels/${this.currentChat.id}`);
      const channelDocSnap = await getDoc(channelDocRef);
      if (channelDocSnap.exists()) {
        const channelData = channelDocSnap.data();
        this.allChannelMembers = channelData?.['members'];
        this.updateOnlineStatus();
      }
    }
  }

  /**
   * Updates the online status of each member in the current chat's channel.
   */
  updateOnlineStatus() {
    this.allChannelMembers.forEach(member => {
      let userIndex = this.authService.findUserIndexWithEmail(member.email);
      member.online = this.userService.users[userIndex].online;
    });
  }
}