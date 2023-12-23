import { Component, HostListener, Inject, Optional, QueryList, ViewChildren, inject } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { MatDialogRef } from '@angular/material/dialog';
import { Channel } from 'src/models/channel.class';
import { ChatService } from '../services/chat.service';
import { UserService } from '../services/user.service';
import { User } from 'src/models/user.class';
import { FirestoreService } from '../services/firestore.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dialog-add-channel',
  templateUrl: './dialog-add-channel.component.html',
  styleUrls: ['./dialog-add-channel.component.scss', './dialog-add-channel.mediaquery.component.scss']
})
export class DialogAddChannelComponent {
  @ViewChildren('userContainer') userContainers!: QueryList<any>;
  channel: Channel = new Channel();
  firestore: Firestore = inject(Firestore);
  addMembers: boolean = false;
  allMembers: boolean = true;
  addChnlInputFocused: boolean = false;
  touched: boolean = false;
  selectedUsers: any[] = [];
  currentUser;
  searchInput: string = '';

  constructor(@Optional() @Inject(MatDialogRef) public dialogRef: MatDialogRef<DialogAddChannelComponent> | undefined, public chatService: ChatService, public userService: UserService, public firestoreService: FirestoreService, public router: Router) {
    firestoreService.loadUsers()
    this.currentUser = this.userService.currentUser;
    chatService.checkScreenWidth();
    if (chatService.isMobile) {
      this.dialogRef = undefined;
    }
  }

  /**
   * Listens for clicks on the document to manage input focus state.
   * @param {Event} event - The click event on the document.
   */
  @HostListener('document:click', ['$event'])
  checkClick(event: Event) {
    const clickedElement = event.target as HTMLElement;
    if (!clickedElement.classList.contains('user-search-container') && !clickedElement.classList.contains('user-container') && this.addChnlInputFocused && !clickedElement.classList.contains('input-members')) {
      this.addChnlInputFocused = false;
    } else {
      this.addChnlInputFocused = true;
    }
  }

  /**
   * Creates a new channel with the selected members.
   * It sets the channel creator to the current user and calls FirestoreService to add the channel.
   */
  async createChannel() {
    this.getMembers();
    this.channel.creator = this.userService.currentUser.name;
    this.channel.creatorId = this.userService.currentUser.id;
    await this.firestoreService.addChannel(this.channel);
    if (this.chatService.isMobile) {
      this.router.navigate(['home']);
    } else {
      this.dialogRef?.close();
    }
  }

  /**
   * Gathers members for the new channel based on the selected options for all members or just selected ones.
   */
  getMembers() {
    if (this.allMembers) {
      this.addSelectedUsersToChannel(this.firestoreService.allUsers)
    } else {
      this.addCurrentUser();
      this.addSelectedUsersToChannel(this.selectedUsers)
    }
  }

  /**
   * Adds the selected users to the new channel's member list.
   * @param {any[]} selectedUsers - An array of users selected to be added to the channel.
   */
  addSelectedUsersToChannel(selectedUsers: any[]) {
    const formattedUsers = selectedUsers.map(user => {
      return {
        name: user.name,
        email: user.email,
        password: user.password,
        id: user.id,
        picture: user.picture,
        online: user.online
      };
    });
    this.channel.members.push(...formattedUsers);
  }

  /**
   * Stops event propagation when a user element is selected.
   * @param {Event} event - The event associated with user selection.
   */
  userSelected(event: Event) {
    event.stopPropagation();
  }

  /**
   * Adds the current user to the list of selected members if they are not already included.
   */
  addCurrentUser() {
    const userAlreadySelected = this.selectedUsers.some(user => user.id === this.currentUser.id);
    if (!userAlreadySelected) {
      this.selectedUsers.push(this.currentUser);
    }
  }

  /**
   * Removes a user from the list of selected members.
   * @param {User} user - The user object to be removed.
   */
  removeUser(user: User) {
    let index = this.selectedUsers.findIndex(obj => obj.id === user.id);
    if (index !== -1) {
      this.selectedUsers.splice(index, 1);
    }
  }
  
  /**
   * Toggles the selection state of a user when clicked and updates the list of selected members.
   * @param {any} user - The user object to be selected or deselected.
   * @param {number} i - The index of the user in the list to highlight the corresponding button.
   */
  selectUser(user: any, i: number) {
    this.highlightButton(i);
    let index = this.selectedUsers.findIndex(obj => obj.id === user.id);
    if (index == -1) {
      this.selectedUsers.push(user);
    } else {
      this.removeUser(user)
    }
  }

  /**
   * Toggles the highlighted state of a user container button.
   * @param {number} index - The index of the user container button to be highlighted.
   */
  highlightButton(index: number) {
    const userContainer = this.userContainers.toArray()[index];
    if (userContainer) {
      userContainer.nativeElement.classList.toggle('user-container-highlighted');
    }
  }
}