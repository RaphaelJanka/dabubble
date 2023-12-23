import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LoginScreenComponent } from './login-screen/login-screen.component';
import { DialogViewProfileComponent } from './dialog-view-profile/dialog-view-profile.component';
import { ImprintComponent } from './imprint/imprint.component';
import { PrivacyComponent } from './privacy/privacy.component';
import { MainChatComponent } from './main-chat/main-chat.component';
import { DialogEditChannelComponent } from './dialog-edit-channel/dialog-edit-channel.component';
import { DirectMessageChatComponent } from './direct-message-chat/direct-message-chat.component';
import { ThreadComponent } from './thread/thread.component';
import { DialogAddChannelComponent } from './dialog-add-channel/dialog-add-channel.component';
import { NewMessageComponent } from './new-message/new-message.component';

const routes: Routes = [
  { path: '', component: LoginScreenComponent },
  { path: 'home', component: HomeComponent },
  { path: 'profile', component: DialogViewProfileComponent },
  { path: 'imprint', component: ImprintComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'main', component: MainChatComponent },
  { path: 'editChannel', component: DialogEditChannelComponent },
  { path: 'directMessage', component: DirectMessageChatComponent },
  { path: 'thread', component: ThreadComponent },
  { path: 'add-channel', component: DialogAddChannelComponent },
  { path: 'newMessage', component: NewMessageComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }