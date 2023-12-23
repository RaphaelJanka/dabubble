import { Component, HostListener } from '@angular/core';
import { ChatService } from './services/chat.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'dabubble';
  isMobile = true;

  constructor(private chatService: ChatService, public router: Router) { }

  /**
   * Event listener for the 'window:resize' event, which triggers actions when the window is resized.
   * @param {any} event - The window resize event object.
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (this.router.url !== '/') {
      this.chatService.checkScreenWidth();
      if (this.chatService.workspaceDrawerStateSubject.value == true && window.innerWidth >= 800 && window.innerWidth < 1350) { }
      this.chatService.closeThread();
    }
  }
}