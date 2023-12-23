import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { UserService } from '../services/user.service';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { User } from 'src/models/user.class';
import { FirestoreService } from '../services/firestore.service';
import { ChatService } from '../services/chat.service';

@Component({
  selector: 'app-login-screen',
  templateUrl: './login-screen.component.html',
  styleUrls: ['./login-screen.component.scss', './login-screen-mediaquery.scss']
})

export class LoginScreenComponent implements OnInit {
  animationIsFinished = false;
  picSrc = "assets/img/avatars/profile.svg";
  switch_expression: any = "login";
  profileImages: any = ["assets/img/avatars/character_1.svg", "assets/img/avatars/character_2.svg", "assets/img/avatars/character_3.svg", "assets/img/avatars/character_4.svg", "assets/img/avatars/character_5.svg", "assets/img/avatars/character_6.svg",]
  newUser: User = new User;
  uploadFile: string = "";
  userNotFound: any;
  resetEmailNotFound: boolean = false;
  userAlreadyInUse: boolean = false;
  showUserCreatedSuccess = false;
  showEmailSent = false;
  selectedImageIndex: number | null = null

  ngOnInit() {
    this.hideContentAfterAnimation();
  }

  constructor(public userService: UserService, public router: Router, public authService: AuthService, public firestoreService: FirestoreService, public chatService: ChatService) { }

  getEmailForNewPassword = new FormGroup({
    emailForReset: new FormControl('', [Validators.required, Validators.email]),
  });

  login = new FormGroup({
    loginemail: new FormControl('', [Validators.required, Validators.email]),
    loginpassword: new FormControl('', [Validators.required]),
  });

  addUser = new FormGroup({
    newName: new FormControl('', [Validators.required, Validators.minLength(5)]),
    newEmail: new FormControl('', [Validators.required, Validators.pattern('[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z0-9]{2,}')]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(8)]),
    disableSelect: new FormControl(false),
  });

  get newName() {
    return this.addUser.get('newName') as FormControl;
  }

  get newEmail() {
    return this.addUser.get('newEmail') as FormControl;
  }

  get newPassword() {
    return this.addUser.get('newPassword') as FormControl;
  }

  get loginemail() {
    return this.login.get('loginemail') as FormControl;
  }

  get emailForReset() {
    return this.getEmailForNewPassword.get('emailForReset') as FormControl;
  }

  get loginpassword() {
    return this.login.get('loginpassword') as FormControl;
  }

  get disableSelect() {
    return this.addUser.get("disableSelect") as FormControl;
  }

  //------------- Functions for error messages of inputs ------------------------------------------------------
  getErrorMessageLogin(): string {
    if (this.loginemail.hasError('required')) {
      return 'Email is required';
    }
    return this.loginemail.hasError('email') ? 'Not a valid email' : '';
  }

  getErrorMessageLoginPassword(): string {
    if (this.loginpassword.hasError('required')) {
      return 'Password is required';
    }
    // Add any other password validation messages here
    return '';
  }

  getErrorMessageReset() {
    if (this.emailForReset?.hasError('email')) {
      return 'Not a valid email';
    }
    return "";
  }

  getErrorMessageNewUser() {
    if (this.newName?.hasError('minlength')) {
      return 'Enter a user name with minimum 5 letters';
    }
    if (this.newName?.hasError('required')) {
      return 'Enter a user name with minimum 5 letters';
    }
    return "";
  }

  getErrorMessageResetEmail(): string {
    if (this.emailForReset.hasError('required')) {
      return 'Email is required for password reset';
    }
    return this.emailForReset.hasError('email') ? 'Not a valid email' : '';
  }

  getErrorMessageNoUser() {
    if (this.userNotFound) {
      return 'Wrong E-mail or password';
    } else {
      return "";
    }
  }

  //---------------------------------------------------------------------------------------------------
  /**
   * Changes picture source
   * @param pic 
   */
  changePicSrc(pic: string, i: any) {
    this.picSrc = pic;
    this.selectedImageIndex = i;
  }

  /**
   * @method createUser
   * @description Asynchronously creates a new user using form data from the `addUser` FormGroup.
   * After attempting to create a user, it will navigate to the avatar selection or show an error if the user is already in use.
   */
  async createUser() {
    const activeUserIndex = this.authService.findUserIndexWithEmail(this.newEmail.value);
    if (activeUserIndex == -1) {
      this.userService.userIsAvailable = true;
      this.gatherNewUserInfo();
      this.firestoreService.showSpinner = true;
      this.delayAndPerformActions();
    } else {
      this.userAlreadyInUse = true;
      this.firestoreService.showSpinner = false;
    }
  }

  /**
   * Delays the execution of a set of actions using setTimeout.
   * If the user is available, changes the switch case to 'avatar',
   * hides the spinner, and sets the userAlreadyInUse flag to false.
   * If the user is not available, sets the userAlreadyInUse flag to true,
   * hides the spinner, and resets the userAlreadyInUse flag after a delay.
   */
  delayAndPerformActions() {
    setTimeout(() => {
      this.changeSwitchCase('avatar');
      this.firestoreService.showSpinner = false;
      setTimeout(() => {
        this.userAlreadyInUse = false;
      }, 1000);
    }, 1000);
  }

  /**
   * Sets new user information
   */
  gatherNewUserInfo() {
    this.newUser.name = this.newName.value;
    this.newUser.email = this.newEmail.value;
    this.newUser.password = this.newPassword.value;
    this.userService.currentEmail = this.newEmail.value;
    this.userService.currentPassword = this.newPassword.value;
  }

  /**
   * Clears inputs
   */
  clearInputs() {
    this.addUser.reset();
  }

  /**
   * @method uploadUser
   * @description Uploads the new user data to the database.
   * Sets the profile picture and marks the user as online before adding them to the user service.
   * Signs in the user and displays a success message upon successful creation.
   */
  async uploadUser() {
    this.newUser.picture = this.picSrc;
    this.newUser.online = true;
    await this.authService.createUser();
    this.signInSuccess();
    await this.userService.addUser(this.newUser as User);
    await this.authService.signInUser(this.userService.currentEmail, this.userService.currentPassword);
  }

  /**
   * @method loginUser
   * @description Logs in a user with the provided email and password.
   * Calls the authentication service to sign in the user and handles both success and failure cases.
   * On success, a flag is set and on failure, an error message is displayed.
   */
  async loginUser() {
    if (this.login.valid) {
      await this.authService.signInUser(this.loginemail.value, this.loginpassword.value);
      if (this.authService.signInSuccess) {
        this.signInSuccess();
      } else {
        this.authService.signInSuccess = false;
        this.userNotFound = true;
        this.getErrorMessageNoUser();
      }
    } else {
      this.userNotFound = true;
      this.getErrorMessageNoUser();
    }
  }

  signInSuccess() {
    this.authService.signInSuccess = true;
    this.userNotFound = false;
    setTimeout(() => {
      this.authService.signInSuccess = false;
    }, 1500);
  }

  /**
   * @method loginWithGoogle
   * @description Initiates the login process using Google authentication.
   * Calls the authentication service's `signInWithGoogle` method.
   */
  loginWithGoogle() {
    this.authService.signInWithGoogle();
  }

  /**
   * @method hideContentAfterAnimation
   * @description Hides certain content after a set animation duration.
   * Sets `animationIsFinished` to true after a delay, indicating that the animation has completed.
   */
  hideContentAfterAnimation() {
    setTimeout(() => {
      this.animationIsFinished = true;
    }, 4000);
  }

  /**
   * @method changeSwitchCase
   * @description Changes the current view or state based on a given switch case string.
   * @param {string} newSwitchCase - The new switch case value to update the component's state.
   */
  changeSwitchCase(newSwitchCase: string) {
    this.clearInputs();
    this.switch_expression = newSwitchCase;
  }

  /**
   * @method sendResetEmail
   * @description Sends a password reset email to the specified address.
   * Shows a confirmation message upon sending the email.
   */
  sendResetEmail() {
    this.authService.sendResetEmail(this.loginemail.value);
    this.showEmailSent = true;
    setTimeout(() => {
      this.showEmailSent = false;
    }, 1000);
  }

  /**
   * @method onFileSelected
   * @description Handles the file selection event for uploading profile images.
   * Uploads the selected file using the authentication service and shows a spinner during the process.
   * @param {Event} event - The event object containing the selected file.
   */
  onFileSelected(event: any): void {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 500000) {
        alert("File is too big!");
      } else {
        this.authService.uploadProfileImage(file);
        this.firestoreService.showSpinner = true;
      }
      setTimeout(() => {
        this.picSrc = this.authService.customPic;
        this.firestoreService.showSpinner = false;
        event.target.value = '';
      }, 2500);
    }
  }

  /**
   * @method checkIfUserExists
   * @description Checks if a user exists based on the provided email and password.
   * Sets the `userNotFound` flag depending on whether the user is found in the user service.
   */
  checkIfUserExists() {
    let userIndex = this.authService.findUserIndexWithEmail(this.loginemail.value);
    if (userIndex !== -1 && this.userService.users[userIndex].password == this.loginpassword.value) {
      this.userNotFound == false
    } else {
      this.userNotFound = true;
    }
  }

  /**
   * @method loginGuest
   * @description Logs in a user as a guest.
   * Signs out any currently authenticated user, signs in as a guest, and navigates to the home page.
   */
  async loginGuest() {
    await this.authService.signOutUser();
    await this.authService.signInGuest();
    this.authService.signInSuccess = true;
    setTimeout(() => {
      this.authService.signInSuccess = false;
      this.router.navigate(['home']);
      this.chatService.chatWindow = 'empty';
    }, 1000);
  }
}