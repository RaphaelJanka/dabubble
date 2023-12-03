import { Component, ElementRef, HostListener, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { DocumentData, DocumentReference, Firestore, addDoc, collection, doc, getDoc, getDocs, updateDoc } from '@angular/fire/firestore';
import { User } from 'src/models/user.class';
import { ChatService } from '../chat.service';
import { UserService } from '../user.service';
import { Channel } from 'src/models/channel.class';
import { Message } from 'src/models/message.class';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../auth.service';
import { EmojiService } from '../emoji.service';


@Component({
  selector: 'app-dialog-add-channel-members',
  templateUrl: './dialog-add-channel-members.component.html',
  styleUrls: ['./dialog-add-channel-members.component.scss']
})
export class DialogAddChannelMembersComponent implements OnInit{
  @ViewChildren('userContainer') userContainers!: QueryList<any>;
  @ViewChild('messageContainer') messageContainer!: ElementRef;
  firestore: Firestore = inject(Firestore);
  currentChat!: Channel | undefined;
  currentUser;
  message: Message = new Message();
  organizedMessages: { date: string, messages: Message[] }[] = []
  allMessages: Message[] = [];
  // ------------- for editing of message ----------------
  edit: boolean = false;
  editingMessage: string | undefined;
  @ViewChild('editor') editor!: ElementRef;
 

  constructor(public dialog: MatDialog, public chatService: ChatService, public userService: UserService, public authService: AuthService, public emojiService: EmojiService) {
    userService.getCurrentUserFromLocalStorage();
    this.currentUser = this.userService.currentUser;

  }


  ngOnInit() {
   
  }

  isToday(date: string): boolean {
    const currentDate = this.getCurrentDate();
    const formattedDate = this.formatDate(currentDate);
    return date === formattedDate;
  }


  getCurrentDate(): string {
    const currentDate = new Date();
    return currentDate.toDateString();
  }


  formatDate(date: string): string {
    const parts = date.split(' ');
    return `${parts[2]}.${this.getMonthNumber(parts[1])}.${parts[3]}`;
  }

  getMonthNumber(month: string): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return (months.indexOf(month) + 1).toString().padStart(2, '0');
  }

  async updateMessageContent(message: Message) {
    let messageId = message.id
    const messageColRef = doc(collection(this.firestore, `channels/${this.currentChat?.id}/messages/`), messageId);
    this.setMessageValues(message);
    await updateDoc(messageColRef, this.message.toJSON()).catch((error) => {
      console.error('Error updating document:', error);
    });
    this.edit = false;
  }

  setMessageValues(message: Message) {
    this.message.id = message.id;
    this.message.creator = message.creator
    this.message.creatorId = message.creatorId;
    this.message.date = message.date;
    this.message.lastThreadTime = message.lastThreadTime;
    this.message.profilePic = message.profilePic;
    this.message.reaction = message.reaction;
    this.message.reactionCount = message.reactionCount;
    this.message.time = message.time;
    this.message.threadCount = message.threadCount;
    this.message.timeInMs = message.timeInMs;
    this.message.content = this.editor.nativeElement.value;
  }



  async addReaction(emoji: any, messageId: any) {
    if (this.currentChat?.id) {
      const subReactionColRef = doc(collection(this.firestore, `channels/${this.currentChat.id}/messages/`), messageId);
      let messageIndex = this.allMessages.findIndex(message => message.id === messageId);
      let currentMessage = this.allMessages[messageIndex];
  
      let existingReaction = currentMessage.reaction.find((r: { emoji: any; }) => r.emoji === emoji);
      
      if (existingReaction) {
        // Prüfe, ob der aktuelle Benutzer der Ersteller der Reaktion ist
        if (existingReaction.creatorId === this.currentUser.id) {
          // Wenn ja, und der Benutzer möchte seine eigene Reaktion entfernen
          existingReaction.count -= 1; // Dekrementiere den Zähler
          // Wenn der Zähler 0 erreicht, entferne die Reaktion komplett
          if (existingReaction.count === 0) {
            currentMessage.reaction = currentMessage.reaction.filter((r: { emoji: any; }) => r.emoji !== emoji);
          }
        } else {
          // Der aktuelle Benutzer ist nicht der Ersteller, erhöhe den Zähler
          existingReaction.count += 1; 
          existingReaction.creatorName = this.currentUser.name;
          // Inkrementiere den Zähler
        }
      } else {
        // Emoji-Reaktion existiert noch nicht, erstelle eine neue
        currentMessage.reaction.push({
          emoji: emoji,
          creatorId: this.currentUser.id, // Der Benutzer, der die Reaktion erstellt
          creatorName: this.currentUser.name, // Optional: Der Name des Benutzers
          count: 1 // Starte den Zähler bei 1
        });
      }
  
      // Aktualisiere das Dokument in Firestore
      await updateDoc(subReactionColRef, {
        reaction: currentMessage.reaction
      });
    }
  }

  openEmojiPicker(messageId: any) {
    setTimeout(() => {
      this.emojiService.showMainChatEmojiPicker = true;
    }, 1);

    this.emojiService.messageId = messageId;
  }


  openEmojiPickerChat() {
    setTimeout(() => {
      this.emojiService.showTextChatEmojiPicker = true;
    }, 1);
  }

  editMessage(message: Message) {
    console.log('Nachricht', message);
    if (this.currentChat) {
      if (message.creator == this.currentUser.name) {
        this.edit = true;
        this.editingMessage = message.id; // Speichern Sie die ID der bearbeiteten Nachricht
      }
    }
  } 

  async sendMessage() {
    if (this.currentChat?.id && this.message.content?.trim() !== '') {
      this.getSentMessageTime();
      this.getSentMessageDate();
      this.getSentMessageCreator();
      this.message.channel = this.currentChat.name;
      const subColRef = collection(this.firestore, `channels/${this.currentChat.id}/messages`);
      await addDoc(subColRef, this.message.toJSON())
        .catch((err) => {
          console.log(err);
        })
        .then((docRef: void | DocumentReference<DocumentData, DocumentData>) => {
          if (docRef && docRef instanceof DocumentReference) {
            if (this.currentChat?.id) {
              this.updateMessageId(`channels/${this.currentChat.id}/messages`, this.message, docRef.id);
            }
          }
          this.message.content = '';
        });

    }
  }

  getSentMessageDate() {
    const currentDate = this.getCurrentDate();
    const formattedDate = this.formatDate(currentDate);
    this.message.date = formattedDate;
  }

  getSentMessageTime() {
    const currentTime = new Date();
    this.message.timeInMs = currentTime.getTime();
    const formattedTime = currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.message.time = formattedTime;
  }


  getSentMessageCreator() {
    this.message.creator = this.userService.currentUser.id;
  }


  scrollToBottom(): void {
    this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
  }

  updateMessage(message: any) {
    return {
      reaction: message.reaction
    }
  }

  async updateMessageId(colId: string, message: Message, newId: string) {
    message.id = newId;
    await this.updateChannel(colId, message);
  }

  async updateChannel(colId: string, message: Message) {
    const docRef = doc(collection(this.firestore, colId), message.id);
    await updateDoc(docRef, this.getUpdateData(message)).catch(
      (error) => { console.log(error); }
    );
  }

  getUpdateData(message: Message) {
    return {
      creator: this.userService.currentUser.name,
      creatorId: this.userService.currentUser.id,
      content: message.content,
      time: message.time,
      date: message.date,
      id: message.id,
      profilePic: this.userService.currentUser.picture,
      reaction: [],
      reactionCount: message.reactionCount,
      threadCount: message.threadCount,

    };
  }
}