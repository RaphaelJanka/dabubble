import { Component } from '@angular/core';
import { ChatService } from '../services/chat.service';
import { BottomSheet } from '../bottom-sheet/bottom-sheet.component';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { User } from 'src/models/user.class';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-header-mobile',
  templateUrl: './header-mobile.component.html',
  styleUrls: ['./header-mobile.component.scss']
})
export class HeaderMobileComponent {
  currentUser: User;
  constructor(public userService: UserService, private _bottomSheet: MatBottomSheet, public chatService: ChatService, public authService: AuthService, public router: Router) {
    userService.getCurrentUserFromLocalStorage();
    this.currentUser = this.userService.currentUser as User;
    chatService.checkScreenWidth();
  }

  /**
   * will open the bottom sheet
   */
  openBottomSheet(): void {
    this._bottomSheet.open(BottomSheet, {
      panelClass: 'dialog-mobile'
    });
  }

  /**
   * Checks if routerlink is home
   */
  isHomeRoute(): boolean {
    return this.router.url === '/home';
  }
}