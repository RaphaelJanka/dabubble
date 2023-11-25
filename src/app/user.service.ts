import { Inject } from '@angular/core';
import { UserData } from './interfaces/user-interface';
import { Injectable } from '@angular/core';
import { Firestore, collection, doc, collectionData, onSnapshot, addDoc, deleteDoc, updateDoc } from '@angular/fire/firestore';
import { Timestamp } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { Router } from '@angular/router';
import { getAuth, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, } from "firebase/auth";


@Injectable({
  providedIn: 'root'
})

export class UserService {

  firestore: Firestore = Inject(Firestore);
  users: UserData[] = [];
  activeUsers: UserData[] = [];
  currentEmail: string = "";
  currentPassword: string = "";
  private auth = getAuth();
  provider = new GoogleAuthProvider();
  signInSuccess = false;
  unsubList;

  ngOnInit() {
  }

  constructor(public router: Router) {
    this.unsubList = this.subUserList();
    // this.unsubSingle = onSnapshot(this.getSingleDocRef("users", "adsfasdf"), (element) => {
    // });
    // this.unsubSingle()

  }

  ngOnDestroy() {
    this.unsubList();
  }

  createUser() {
    createUserWithEmailAndPassword(this.auth, this.currentEmail, this.currentPassword)
      .then((userCredential) => {
        console.log(this.currentEmail, this.currentPassword);
        const user = userCredential.user;
        console.log("created User:", user)
      })
      .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log(`Error Code: ${errorCode}`);
        console.log(`Error Message: ${errorMessage}`);
        // ..
      });

  }

  signInUser(email: string, password: string) {
    signInWithEmailAndPassword(this.auth, email, password)
      .then((userCredential) => {
        console.log('Benutzer angemeldet:', userCredential.user);
        this.signInSuccess = true;
        let activeUser = this.findUserWithEmail(email);
        this.activeUsers.push(activeUser as UserData);
        console.log("Diese Nutzer sind Eingeloggt", this.activeUsers);
        if (this.signInSuccess) {
          this.router.navigate(['home']);
        }
      })
      .catch((error) => {
        console.error('Anmeldefehler:', error);
      });
  }


  signOutUser() {
    signOut(this.auth).then(() => {
      console.log('Benutzer erfolgreich abgemeldet');
      this.activeUsers = [];
    }).catch((error) => {
      console.error('Fehler beim Abmelden:', error);
    });
  }




  setUserData(obj: any,) {
    // Check if 'birthdate' is a Timestamp and convert to Date object
    return {
      name: obj.name || "",
      email: obj.email || "",
      password: obj.password || "",
      id: obj.id,
      picture: obj.picture || "",
    }
  }

  async addUser(item: UserData) {
    await addDoc(this.getUsersRef(), item).catch(
      (err) => { console.log(err) }
    ).then(
      (docRef) => {
        console.log()
        this.updateUserId(item, docRef!.id);
        console.log("New user with id", docRef!.id)
      }
    )
  }

  subUserList() {
    return onSnapshot(this.getUsersRef(), (list) => {
      this.users = [];
      list.forEach(element => {
        this.users.push(this.setUserData(element.data()));
        console.log("Available users", element.data());
      })
    })
  }



  async deleteCustomer(colId: "users", docId: string) {
    await deleteDoc(this.getSingleDocRef(colId, docId)).catch(

      (err) => { console.log(err); }
    )
  }

  async updateUserId(user: UserData, newId: string) {
    user.id = newId;
    await this.updateUser(user);
  }
  async updateUser(user: UserData) {
    let docRef = this.getSingleDocRef('users', user.id);
    await updateDoc(docRef, this.getUpdateData(user)).catch(

      (error) => { console.log(error); }

    );


  }

  getUpdateData(user: UserData) {
    return {
      name: user.name,
      email: user.email,
      password: user.password,
      id: user.id,
      picture: user.picture,
    }

  }



  // getCleanJson(note: Note) {
  //    return {
  //     type: note.type,
  //     titel: note.titel,
  //     content: note.content,
  //     marked: note.marked,
  //    }
  // }
  // getColIdFromNote(customer: CustomerData) {
  //   if (note.type == 'note') {
  //     return 'Notes'
  //   } else {
  //     return 'Trash'
  //   }
  // }

  /**This is for getting the collection "customers" from firebase */
  getUsersRef() {
    return collection(this.firestore, 'users');
  }

  /**Here i get the Infos about a single customer, 
  
  * colId = the id from the collection, in this case probably "customers,"
  * doc id = the specific id from a customer.
  */
  getSingleDocRef(colId: string, docId: string) {
    return doc(collection(this.firestore, colId), docId);
  }

  findUserWithEmail(email: string) {
    return this.users.find(user => user.email === email);
  }


}
