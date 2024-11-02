import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-start',
  standalone: true,
  imports: [],
  templateUrl: './start.component.html',
  styleUrl: './start.component.scss'
})
export class StartComponent {
  private apiUrl = 'http://localhost:3001/api/rating';

  constructor(private http: HttpClient) {}

  getRatings(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }
}
