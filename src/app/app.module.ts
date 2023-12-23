import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { LoginScreenComponent } from './login-screen/login-screen.component';
import { HomeComponent } from './home/home.component';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatRippleModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkspaceComponent } from './workspace/workspace.component';
import { MainChatComponent } from './main-chat/main-chat.component';
import { ThreadComponent } from './thread/thread.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { DialogEditChannelComponent } from './dialog-edit-channel/dialog-edit-channel.component';
import { ReactiveFormsModule } from '@angular/forms';
import { DialogViewProfileComponent } from './dialog-view-profile/dialog-view-profile.component';
import { DialogAddChannelComponent } from './dialog-add-channel/dialog-add-channel.component';
import { DialogAddToGroupComponent } from './dialog-add-to-group/dialog-add-to-group.component';
import { DialogShowGroupMemberComponent } from './dialog-show-group-member/dialog-show-group-member.component';
import { FormsModule } from '@angular/forms';
import { ImprintComponent } from './legal-notice/imprint.component';
import { DirectMessageChatComponent } from './direct-message-chat/direct-message-chat.component';
import { PickerComponent } from '@ctrl/ngx-emoji-mart';
import { PrivacyComponent } from './privacy/privacy.component';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatListModule } from '@angular/material/list';
import { HeaderMobileComponent } from './header-mobile/header-mobile.component';
import { NewMessageComponent } from './new-message/new-message.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginScreenComponent,
    HomeComponent,
    WorkspaceComponent,
    MainChatComponent,
    ThreadComponent,
    DialogEditChannelComponent,
    DialogViewProfileComponent,
    DialogAddChannelComponent,
    DialogAddToGroupComponent,
    DialogShowGroupMemberComponent,
    ImprintComponent,
    DirectMessageChatComponent,
    PrivacyComponent,
    HeaderMobileComponent,
    NewMessageComponent,
  ],
  imports: [
    BrowserModule,
    MatIconModule,
    MatFormFieldModule,
    MatSidenavModule,
    MatMenuModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatRippleModule,
    MatRadioModule,
    AppRoutingModule,
    MatInputModule,
    BrowserAnimationsModule,
    MatButtonModule,
    MatListModule,
    MatCardModule,
    MatCheckboxModule,
    MatBottomSheetModule,
    MatDatepickerModule,
    MatDialogModule,
    MatDividerModule,
    MatTooltipModule,
    MatSnackBarModule,
    FormsModule,
    MatSliderModule,
    MatSelectModule,
    MatExpansionModule,
    ReactiveFormsModule,
    PickerComponent,
    provideFirebaseApp(() => initializeApp({ 
      "apiKey": "AIzaSyDYnjZL0mE7UKeWUbdzFQOXTD_jdLp01eU",
      "authDomain": "dabubble-a3b9c.firebaseapp.com",
      "projectId": "dabubble-a3b9c", 
      "storageBucket": "dabubble-a3b9c.appspot.com",
      "messagingSenderId": "621137982901", 
      "appId": "1:621137982901:web:54b82e0dbda9aef71bd5fc"})),
    provideFirestore(() => getFirestore())],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }