import React, { useState } from 'react'
import blogService from '../services/blogs'

const Blog = ({ blog,user, blogs, setBlogs, like,}) => {
    const [likes, setLikes] = useState(blog.likes)
    const [showBlogDetails, setShowBlogDetails] = useState(false)
    const [buttonLabel, setButtonLabel] = useState('view')
    const showOrHide = { display: showBlogDetails ? '' : 'none' }
    const showForOwnerOnly = { display: user.id === (blog.user.id || blog.user) ? '' : 'none', backgroundColor: 'blue' }

    const toggleView = () => {
        if (showBlogDetails) {
            setShowBlogDetails(false)
            setButtonLabel('view')
        } else {
            setShowBlogDetails(true)
            setButtonLabel('hide')
        }
    }

    const likeBlog = (event) => {
        event.preventDefault()
        const blogObject = {
            title: blog.title,
            author: blog.author,
            url: blog.url,
            likes: likes + 1,
            user: blog.user.id || blog.user
        }
        const id = blog.id
        like(id, blogObject,setLikes)
    }


    const removeBlog = async (event) => {
        event.preventDefault()
        const message = `Remove blog ${blog.name} by ${blog.author}`
        if (window.confirm(message)) {
            try {
                await blogService.remove(blog.id)
                setBlogs(blogs.filter(b => b.id !== blog.id))
            } catch (e) {
                console.log(e.message)
            }
        }
    }

    const blogStyle = {
        paddingTop: 5,
        paddingBottom: 5,
        paddingLeft: 15,
        border: 'solid',
        borderWidth: 1,
        marginBottom: 5,
        listStyle:'none'
    }

    return (
        <div style={blogStyle}>
            <div>{blog.title} {blog.author} <button onClick={toggleView}>{buttonLabel}</button></div>
            <div style= {showOrHide} className='showOrHide'>
                <div>{blog.url}</div>
                <div>Likes {likes} <button onClick={likeBlog}>like</button></div>
                <div>{blog.user.username}</div>
                <button style={showForOwnerOnly} onClick={removeBlog}>remove</button>
            </div>
        </div>
    )
}

export default Blog
