import { Component, ViewChild, ElementRef, HostListener } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DialogViewProfileComponent } from '../dialog-view-profile/dialog-view-profile.component';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from 'src/models/user.class';
import { Message } from 'src/models/message.class';
import { FirestoreService } from '../services/firestore.service';
import { Channel } from 'src/models/channel.class';
import { ChatService } from '../services/chat.service';
import { ThreadService } from '../services/thread.service';
import { MatBottomSheet, MatBottomSheetRef } from '@angular/material/bottom-sheet';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss', './home.mediaquery.component.scss']
})

export class HomeComponent {
  showFiller: any;
  currentUser: any = {
    name: "Guest",
    email: "",
    password: "",
    id: "",
    picture: "assets/img/avatars/profile.svg",
    online: false,
  }

  @ViewChild('search') search!: ElementRef;
  searchInput: string = '';
  homeInputFocused: boolean = false;
  filteredUsers: User[] = [];
  filteredChannels: Channel[] = [];
  filteredChannelMessages: Message[] = [];
  filteredDirectMessages: Message[] = [];
  allChannelMessagesLoaded = false;
  allDMMessagesLoaded = false;

  constructor(private _bottomSheet: MatBottomSheet, public dialog: MatDialog, public auth: AuthService, public router: Router, public userService: UserService, public chatService: ChatService, public firestoreService: FirestoreService, public threadService: ThreadService) {
    this.userService.getCurrentUserFromLocalStorage();
    this.currentUser = this.userService.currentUser;
    this.chatService.checkScreenWidth();
  }

  openBottomSheet(): void {
    this._bottomSheet.open(BottomSheetOverviewExampleSheet);
  }

  /**
   * Listens for document click events and checks if the click is outside user search and member inputs to update focus state.
   * @param {Event} event - The DOM event object.
   */
  @HostListener('document:click', ['$event'])
  checkClick(event: Event) {
    const clickedElement = event.target as HTMLElement;
    if (!clickedElement.classList.contains('home-search') && !clickedElement.classList.contains('user-search-container') && !clickedElement.classList.contains('user-container') && this.homeInputFocused && !clickedElement.classList.contains('input-members')) {
      this.homeInputFocused = false;
      this.searchInput = '';
    }
  }

  /**
   * Opens a profile dialog for viewing a user's profile based on the provided user ID.
   * @param {any} id - The ID of the user for whom the profile is to be viewed.
   */
  openProfileDialog(id: any): void {
    this.dialog.open(DialogViewProfileComponent, {
      panelClass: 'dialog-container',
      data: { userID: id },
    });
  }

  /**
   * Logs out the current user and navigates to the login screen.
   */
  logOutUser() {
    this.auth.signOutUser();
    this.router.navigate(['']);
  }

  /**
   * Filters users, channels, and direct messages based on the search input. Updates filtered results.
   */
  filterEverything(): void {
    this.homeInputFocused = true;
    if (this.searchInput) {
      this.firestoreService.filterAllUsers(this.searchInput);
      this.filterChannelMessages();
      this.filterDirectMessages();
    }
    if (this.searchInput.trim() === '') {
      this.allChannelMessagesLoaded = false;
      this.allDMMessagesLoaded = false
      this.firestoreService.filteredUsers = [];
      this.filteredDirectMessages = [];
      this.filteredChannelMessages = [];
    }
  }

  /**
   * Filters channel messages based on the search input.
   */
  async filterChannelMessages() {
    if (!this.allChannelMessagesLoaded) {
      this.allChannelMessagesLoaded = true;
      await this.chatService.getallChannels();
      await this.chatService.getAllChannelMessages();
    }
    this.filteredChannelMessages = [];
    let searchTerm: any;
    if (this.searchInput == '#') {
      this.filteredChannelMessages = this.chatService.allMessagesOfChannel;
    } else {
      if (this.searchInput.startsWith('#')) {
        searchTerm = this.searchInput.substring(1).toLowerCase().trim();
      } else {
        searchTerm = this.searchInput.toLowerCase().trim();
      }
    }
    this.chatService.allMessagesOfChannel.forEach(message => {
      if (message.content?.toLowerCase().includes(searchTerm)) {
        this.filteredChannelMessages.push(message);
      }
    });
  }

  /**
   * Filters direct messages based on the search input.
   */
  async filterDirectMessages() {
    if (!this.allDMMessagesLoaded) {
      this.allDMMessagesLoaded = true;
      await this.chatService.loadAllDirectMessages();
      await this.chatService.getDMMessages();
    }
    this.filteredDirectMessages = [];
    this.chatService.allMessagesOfDM.forEach(message => {
      if (message.content?.toLowerCase().includes(this.searchInput.toLowerCase().trim())) {
        this.filteredDirectMessages.push(message);
      }
    });
  }

  /**
   * Navigates to the channel chat window and emits a chat change event.
   * @param {Channel} channel - The channel to be rendered.
   */
  renderChannel(channel: Channel) {
    this.chatService.openChat = channel;
    this.chatService.chatWindow = 'channel';
    this.threadService.changeChat.emit();
    if (this.chatService.isMobile) {
      this.router.navigate(['main']);
    }
  }

  /**
   * Creates a direct message chat with the selected user and navigates to the direct message chat window.
   * @param {any} user - The user selected for direct messaging.
   */
  selectUser(user: any) {
    this.chatService.createDirectMessage(user);
    this.chatService.chatWindow = 'direct';
    this.search.nativeElement.value = '';
    this.homeInputFocused = false;
    if (this.chatService.isMobile) {
      this.router.navigate(['main']);
    }
  }

  /**
   * Retrieves and displays the channel associated with a specific message.
   * @param {any} message - The message used to identify the channel.
   */
  selectChannel(message: any) {
    this.searchInput = '';
    this.chatService.getChannelByMessage(message);
    this.homeInputFocused = false;
  }

  /**
   * Retrieves and displays the direct message chat associated with a specific message.
   * @param {any} message - The message used to identify the direct message chat.
   */
  selectDirectMessage(message: any) {
    this.searchInput = '';
    this.chatService.getDirectMessageByMessage(message);
    this.homeInputFocused = false;
  }
}

export class BottomSheetOverviewExampleSheet {
  constructor(private _bottomSheetRef: MatBottomSheetRef<BottomSheetOverviewExampleSheet>) { }

  openLink(event: MouseEvent): void {
    this._bottomSheetRef.dismiss();
    event.preventDefault();
  }
}