import { Component } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { DialogViewProfileComponent } from '../dialog-view-profile/dialog-view-profile.component';
import { UserService } from '../services/user.service';
import { User } from 'src/models/user.class';

@Component({
  selector: 'app-bottom-sheet',
  templateUrl: './bottom-sheet.component.html',
  styleUrls: ['./bottom-sheet.component.scss'],
})
export class BottomSheet {
  currentUser: User;
  constructor(private _bottomSheetRef: MatBottomSheetRef<BottomSheet>, public userService: UserService,  
    public authService: AuthService,  public router: Router, public dialog: MatDialog) { 
    this.currentUser = this.userService.currentUser as User;
  }

  /**
   * Logs out the current user and navigates to the login screen.
   */
  logOutUser() {
    this._bottomSheetRef.dismiss();
    this.authService.signOutUser();
    this.router.navigate(['']);
  }
    
  /**
  * Opens the profile view dialog for a specific user.
  * @param {any} id - The ID of the user.
  */
  openProfileDialog(): void {
    this.dialog.open(DialogViewProfileComponent, {
      panelClass: 'dialog-container',
      data: { userID: this.currentUser.id },
    });
  }
}